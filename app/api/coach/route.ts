import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { vindModel, standaardModel, type ModelConfig } from "@/lib/providers";
import { BIB_STAPPEN } from "@/lib/stappen";

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
  } = body;

  if (![1, 2].includes(fase) || !vraag?.trim()) {
    return new Response("Ongeldig verzoek.", { status: 400 });
  }

  const model =
    (modelId ? vindModel(modelId) : null) ?? standaardModel();

  if (!model) {
    return new Response(
      "Geen AI-model beschikbaar. Stel een API key in (ANTHROPIC_API_KEY, OPENAI_API_KEY of MISTRAL_API_KEY).",
      { status: 503 },
    );
  }

  const ctx = Object.entries(bouwstenen || {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${labelVoor(+k)}: ${v}`)
    .join("\n");

  const system = await loadPrompt(fase, { tone: tone ?? "rustig, duidelijk, positief" });

  const wisselNoot = modelGewisseld
    ? `[systeem-noot: sinds het vorige antwoord is de leerling gewisseld naar een ander AI-model. Je hebt de eerdere chat niet bij de hand. Erken dit kort in je antwoord.]\n\n`
    : "";

  const user =
    fase === 1
      ? `${wisselNoot}Huidige bouwstenen:\n${ctx || "(nog leeg)"}\n\nLeerling: "${vraag}"`
      : `${wisselNoot}Bouwstenen:\n${ctx || "(nog leeg)"}\n\nVerhaal tot nu toe:\n"${(verhaalTekst ?? "").slice(0, 2000)}"\n${
          selectie ? `\nGeselecteerde zin: "${selectie}"\n` : ""
        }\nLeerling: "${vraag}"`;

  try {
    const stream = await streamForModel(model, system, user);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Model": model.id,
      },
    });
  } catch (err) {
    console.error("coach error", err);
    return new Response(
      "Coach is even niet bereikbaar. Probeer het zo opnieuw.",
      { status: 503 },
    );
  }
}
