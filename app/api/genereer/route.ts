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

type Body = {
  tone: string;
  bouwstenen: Record<string, string>;
  modelId?: string;
};

const MAX_TOKENS = 700;

async function loadPrompt(vars: Record<string, string>) {
  const raw = await fs.readFile(
    path.join(process.cwd(), "prompts", "genereer.md"),
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
    max_tokens: MAX_TOKENS,
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
    max_tokens: MAX_TOKENS,
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
    maxTokens: MAX_TOKENS,
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

  const { tone, bouwstenen, modelId } = body;

  if (tooLong(tone, MAX_LENGTHS.tone)) {
    return new Response("Invoer te lang.", { status: 400 });
  }
  if (
    !bouwstenen ||
    Object.values(bouwstenen).some((v) => tooLong(v, MAX_LENGTHS.bouwsteen))
  ) {
    return new Response("Bouwsteen te lang.", { status: 400 });
  }

  const ontbrekend = BIB_STAPPEN.filter(
    (s) => !(bouwstenen?.[String(s.n)] || "").trim(),
  );
  if (ontbrekend.length > 0) {
    return new Response(
      "Vul eerst alle bouwstenen in voordat je het verhaal laat genereren.",
      { status: 400 },
    );
  }

  const model =
    (modelId ? vindModel(modelId) : null) ?? standaardModel();

  if (!model) {
    return new Response(
      "Geen AI-model beschikbaar. Stel een API key in (ANTHROPIC_API_KEY, OPENAI_API_KEY of MISTRAL_API_KEY).",
      { status: 503 },
    );
  }

  const schoneTone = clean(tone, MAX_LENGTHS.tone);

  const ctx = BIB_STAPPEN.map((s) => {
    const v = clean(bouwstenen[String(s.n)], MAX_LENGTHS.bouwsteen).trim();
    return `${s.n}. ${labelVoor(s.n)}: ${escapeQuotes(v)}`;
  }).join("\n");

  const system = await loadPrompt({
    tone: schoneTone || "rustig, duidelijk, positief",
  });

  const user = `Bouwstenen van de leerling:\n${ctx}\n\nSchrijf nu het korte verhaal.`;

  try {
    const stream = await streamForModel(model, system, user);
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Model": model.id,
    };
    if (rl.cookieToSet) headers["Set-Cookie"] = rl.cookieToSet;
    return new Response(stream, { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("genereer error:", msg);
    const lower = msg.toLowerCase();
    const isCapaciteit =
      lower.includes("429") ||
      lower.includes("capacity") ||
      lower.includes("rate") ||
      lower.includes("quota");
    const tekst = isCapaciteit
      ? `${model.label} heeft op dit moment geen capaciteit. Wissel rechtsboven via "AI: ${model.label} ▾" naar een ander model (bv. Claude Haiku of GPT-4.1 mini) en probeer opnieuw.`
      : `Het AI-model (${model.label}) is even niet bereikbaar. Probeer het zo opnieuw, of kies rechtsboven een ander model.`;
    return new Response(tekst, { status: 503 });
  }
}
