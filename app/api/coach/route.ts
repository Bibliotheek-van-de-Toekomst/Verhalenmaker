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
import { checkRateLimit, rateLimitFoutmelding } from "@/lib/ratelimit";

export const runtime = "nodejs";

type Modus = "coach" | "schrijver";

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
  modus?: Modus;
};

function promptBestand(fase: 1 | 2, modus: Modus): string {
  if (fase === 2 && modus === "schrijver") return "fase2-ai.md";
  return `fase${fase}.md`;
}

async function loadPrompt(
  fase: 1 | 2,
  modus: Modus,
  vars: Record<string, string>,
) {
  const raw = await fs.readFile(
    path.join(process.cwd(), "prompts", promptBestand(fase, modus)),
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
  maxTokens: number,
) {
  const anthropic = new Anthropic({ apiKey: process.env[model.envKey]! });
  const stream = anthropic.messages.stream({
    model: model.modelId,
    max_tokens: maxTokens,
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
  maxTokens: number,
) {
  const openai = new OpenAI({ apiKey: process.env[model.envKey]! });
  const stream = await openai.chat.completions.create({
    model: model.modelId,
    max_tokens: maxTokens,
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
  maxTokens: number,
) {
  const client = new Mistral({ apiKey: process.env[model.envKey]! });
  const stream = await client.chat.stream({
    model: model.modelId,
    maxTokens,
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
  maxTokens: number,
) {
  switch (model.provider) {
    case "anthropic":
      return streamAnthropic(model, system, user, maxTokens);
    case "openai":
      return streamOpenAI(model, system, user, maxTokens);
    case "mistral":
      return streamMistral(model, system, user, maxTokens);
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  const rl = await checkRateLimit(req);
  if (!rl.ok) {
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(rl.resetInSec),
    };
    if (rl.cookieToSet) headers["Set-Cookie"] = rl.cookieToSet;
    return new Response(rateLimitFoutmelding(rl.reden, rl.resetInSec), {
      status: 429,
      headers,
    });
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
    modus: modusRuw,
  } = body;

  const modus: Modus = modusRuw === "schrijver" ? "schrijver" : "coach";
  const maxTokens = fase === 2 && modus === "schrijver" ? 900 : 500;

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

  const system = await loadPrompt(fase, modus, {
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
    const stream = await streamForModel(model, system, user, maxTokens);
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Model": model.id,
    };
    if (rl.cookieToSet) headers["Set-Cookie"] = rl.cookieToSet;
    return new Response(stream, { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("coach error:", msg);
    const lower = msg.toLowerCase();
    const isCapaciteit =
      lower.includes("429") ||
      lower.includes("capacity") ||
      lower.includes("rate") ||
      lower.includes("quota");
    const tekst = isCapaciteit
      ? `${model.label} heeft op dit moment geen capaciteit. Wissel rechtsboven via "AI: ${model.label} ▾" naar een ander model (bv. Claude Haiku of GPT-4.1 mini) en probeer opnieuw.`
      : `Coach (${model.label}) is even niet bereikbaar. Probeer het zo opnieuw, of kies rechtsboven een ander model.`;
    return new Response(tekst, { status: 503 });
  }
}
