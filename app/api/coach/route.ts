import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { vindModel, standaardModel, type ModelConfig } from "@/lib/providers";
import { BIB_STAPPEN } from "@/lib/stappen";
import {
  MAX_LENGTHS,
  clean,
  escapeQuotes,
  tooLong,
  isAllowedOrigin,
} from "@/lib/invoer";

export const runtime = "nodejs";

type Body = {
  fase: 1 | 2;
  tone: string;
  bouwstenen: Record<string, string>;
  vraag: string;
  verhaalTekst?: string;
  selectie?: string;
  modelId?: string;
  modelGewisseld?: boolean;
  actieveBouwsteen?: number;
};

async function loadPrompt(fase: 1 | 2, vars: Record<string, string>) {
  const raw = await fs.readFile(
    path.join(process.cwd(), "prompts", `fase${fase}.md`),
    "utf-8",
  );
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    raw,
  );
}

function labelVoor(n: number) {
  return BIB_STAPPEN.find((s) => s.n === n)?.titel ?? `Stap ${n}`;
}

async function streamAnthropic(
  model: ModelConfig,
  system: string,
  user: string,
) {
  const anthropic = new Anthropic({ apiKey: process.env[model.envKey]! });
  const stream = anthropic.messages.stream({
    model: model.modelId,
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: user }],
  });
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (
            ev.type === "content_block_delta" &&
            ev.delta.type === "text_delta"
          ) {
            controller.enqueue(enc.encode(ev.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function streamOpenAI(
  model: ModelConfig,
  system: string,
  user: string,
) {
  const openai = new OpenAI({ apiKey: process.env[model.envKey]! });
  const stream = await openai.chat.completions.create({
    model: model.modelId,
    max_tokens: 500,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const t = chunk.choices[0]?.delta?.content;
          if (t) controller.enqueue(enc.encode(t));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function streamMistral(
  model: ModelConfig,
  system: string,
  user: string,
) {
  const client = new Mistral({ apiKey: process.env[model.envKey]! });
  const stream = await client.chat.stream({
    model: model.modelId,
    maxTokens: 500,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          const t = event.data?.choices?.[0]?.delta?.content;
          if (typeof t === "string" && t) controller.enqueue(enc.encode(t));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function streamForModel(
  model: ModelConfig,
  system: string,
  user: string,
) {
  switch (model.provider) {
    case "anthropic":
      return streamAnthropic(model, system, user);
    case "openai":
      return streamOpenAI(model, system, user);
    case "mistral":
      return streamMistral(model, system, user);
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Ongeldig verzoek.", { status: 400 });
  }

  const {
    fase,
    tone,
    bouwstenen,
    vraag,
    verhaalTekst,
    selectie,
    modelId,
    modelGewisseld,
    actieveBouwsteen,
  } = body;

  if (![1, 2].includes(fase) || !vraag?.trim()) {
    return new Response("Ongeldig verzoek.", { status: 400 });
  }

  if (
    tooLong(vraag, MAX_LENGTHS.vraag) ||
    tooLong(selectie, MAX_LENGTHS.selectie) ||
    tooLong(verhaalTekst, MAX_LENGTHS.verhaalTekst + 500) ||
    tooLong(tone, MAX_LENGTHS.tone)
  ) {
    return new Response("Invoer te lang.", { status: 400 });
  }
  if (
    bouwstenen &&
    Object.values(bouwstenen).some((v) => tooLong(v, MAX_LENGTHS.bouwsteen))
  ) {
    return new Response("Bouwsteen te lang.", { status: 400 });
  }

  const model =
    (modelId ? vindModel(modelId) : null) ?? standaardModel();

  if (!model) {
    return new Response(
      "Geen AI-model beschikbaar. Stel een API key in (ANTHROPIC_API_KEY, OPENAI_API_KEY of MISTRAL_API_KEY).",
      { status: 503 },
    );
  }

  const schoneVraag = escapeQuotes(clean(vraag, MAX_LENGTHS.vraag));
  const schoneSelectie = selectie
    ? escapeQuotes(clean(selectie, MAX_LENGTHS.selectie))
    : "";
  const schoneVerhaalTekst = clean(verhaalTekst, MAX_LENGTHS.verhaalTekst);
  const schoneTone = clean(tone, MAX_LENGTHS.tone);

  const ctx = Object.entries(bouwstenen || {})
    .filter(([, v]) => v?.trim())
    .map(
      ([k, v]) =>
        `${labelVoor(+k)}: ${escapeQuotes(clean(v, MAX_LENGTHS.bouwsteen))}`,
    )
    .join("\n");

  const system = await loadPrompt(fase, {
    tone: schoneTone || "rustig, duidelijk, positief",
  });

  const wisselNoot = modelGewisseld
    ? `[systeem-noot: sinds het vorige antwoord is de leerling gewisseld naar een ander AI-model. Je hebt de eerdere chat niet bij de hand. Erken dit kort in je antwoord.]\n\n`
    : "";

  const actieveNoot =
    fase === 1 &&
    typeof actieveBouwsteen === "number" &&
    actieveBouwsteen >= 1 &&
    actieveBouwsteen <= 6
      ? `De leerling werkt op dit moment aan bouwsteen ${actieveBouwsteen} (${labelVoor(
          actieveBouwsteen,
        )}). Als de vraag dubbelzinnig is (bijvoorbeeld alleen "is dit goed?" of "wat kan beter?"), ga ervan uit dat het over deze bouwsteen gaat.\n\n`
      : "";

  const user =
    fase === 1
      ? `${wisselNoot}${actieveNoot}Huidige bouwstenen:\n${ctx || "(nog leeg)"}\n\nLeerling: "${schoneVraag}"`
      : `${wisselNoot}Bouwstenen:\n${ctx || "(nog leeg)"}\n\nVerhaal tot nu toe:\n"${schoneVerhaalTekst}"\n${
          schoneSelectie ? `\nGeselecteerde zin: "${schoneSelectie}"\n` : ""
        }\nLeerling: "${schoneVraag}"`;

  try {
    const stream = await streamForModel(model, system, user);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Model": model.id,
      },
    });
  } catch (err) {
    console.error(
      "coach error:",
      err instanceof Error ? err.message : "unknown",
    );
    return new Response(
      "Coach is even niet bereikbaar. Probeer het zo opnieuw.",
      { status: 503 },
    );
  }
}
