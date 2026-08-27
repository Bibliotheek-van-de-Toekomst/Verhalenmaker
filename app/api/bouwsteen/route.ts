// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import {
  vindModel,
  standaardModel,
  type ModelConfig,
} from "@/lib/providers";
import { BIB_STAPPEN, WAAROM } from "@/lib/stappen";
import {
  MAX_LENGTHS,
  clean,
  escapeQuotes,
  tooLong,
  isAllowedOrigin,
} from "@/lib/invoer";
import { checkRateLimit, rateLimitFoutmelding } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  bouwsteenNr: number;
  tekst: string;
  modelId?: string;
};

export type Oordeel = "kan-concreter" | "goed" | "sterk";
const OORDELEN: Oordeel[] = ["kan-concreter", "goed", "sterk"];

const MAX_TOKENS = 150;

// Korter dan dit valt er nog niets zinnigs over te zeggen; dan toont de
// client gewoon geen oordeel in plaats van een leerling af te schrikken.
const MIN_TEKENS = 12;

async function loadPrompt(vars: Record<string, string>) {
  const raw = await fs.readFile(
    path.join(process.cwd(), "prompts", "bouwsteen.md"),
    "utf-8",
  );
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    raw,
  );
}

async function callModel(
  model: ModelConfig,
  system: string,
  user: string,
): Promise<string> {
  switch (model.provider) {
    case "anthropic": {
      const c = new Anthropic({ apiKey: process.env[model.envKey]! });
      const resp = await c.messages.create({
        model: model.modelId,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = resp.content[0];
      return block && block.type === "text" ? block.text : "";
    }
    case "openai": {
      const c = new OpenAI({ apiKey: process.env[model.envKey]! });
      const resp = await c.chat.completions.create({
        model: model.modelId,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });
      return resp.choices[0]?.message?.content ?? "";
    }
    case "mistral": {
      const c = new Mistral({ apiKey: process.env[model.envKey]! });
      const resp = await c.chat.complete({
        model: model.modelId,
        maxTokens: MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        responseFormat: { type: "json_object" },
      });
      const content = resp.choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((c) => (typeof c === "string" ? c : ""))
          .join("");
      }
      return "";
    }
  }
}

// Modellen zetten er soms een ```json-hek omheen of wat tekst ervoor.
function parseAntwoord(
  ruw: string,
): { oordeel: Oordeel; tip: string } | null {
  const start = ruw.indexOf("{");
  const eind = ruw.lastIndexOf("}");
  if (start === -1 || eind <= start) return null;
  try {
    const data = JSON.parse(ruw.slice(start, eind + 1));
    const oordeel = String(data?.oordeel || "").trim() as Oordeel;
    if (!OORDELEN.includes(oordeel)) return null;
    const tip = clean(String(data?.tip ?? ""), 160).trim();
    return { oordeel, tip };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await checkRateLimit(req);
  if (!rl.ok) {
    const resp = NextResponse.json(
      { error: rateLimitFoutmelding(rl.reden, rl.resetInSec) },
      { status: 429, headers: { "Retry-After": String(rl.resetInSec) } },
    );
    if (rl.cookieToSet) resp.headers.set("Set-Cookie", rl.cookieToSet);
    return resp;
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const stap = BIB_STAPPEN.find((s) => s.n === Number(body.bouwsteenNr));
  if (!stap) {
    return NextResponse.json(
      { error: "Onbekende bouwsteen." },
      { status: 400 },
    );
  }
  if (tooLong(body.tekst, MAX_LENGTHS.bouwsteen)) {
    return NextResponse.json(
      { error: "Bouwsteen te lang." },
      { status: 400 },
    );
  }

  const tekst = clean(body.tekst, MAX_LENGTHS.bouwsteen).trim();
  if (tekst.length < MIN_TEKENS) {
    return NextResponse.json({ oordeel: null, tip: "" });
  }

  const model =
    (body.modelId ? vindModel(body.modelId) : null) ?? standaardModel();
  if (!model) {
    return NextResponse.json(
      { error: "Geen AI-model beschikbaar." },
      { status: 503 },
    );
  }

  const system = await loadPrompt({
    titel: stap.titel,
    hint: stap.hint,
    waarom: WAAROM[stap.n] ?? stap.hint,
  });
  const user = `Tekst van de leerling:\n"${escapeQuotes(tekst)}"\n\nGeef je oordeel als JSON.`;

  try {
    // Mistral geeft met enige regelmaat een 503 "overflow" terug. Omdat deze
    // chip tijdens het typen verschijnt, valt zo'n hapering meteen op. Eén
    // herkansing vangt dat af zonder het verzoek merkbaar te vertragen.
    let ruw: string;
    try {
      ruw = await callModel(model, system, user);
    } catch {
      await new Promise((r) => setTimeout(r, 400));
      ruw = await callModel(model, system, user);
    }
    const uitslag = parseAntwoord(ruw);
    if (!uitslag) {
      // Liever geen oordeel dan een verzonnen oordeel.
      return NextResponse.json({ oordeel: null, tip: "" });
    }
    const resp = NextResponse.json(uitslag);
    if (rl.cookieToSet) resp.headers.set("Set-Cookie", rl.cookieToSet);
    return resp;
  } catch (err) {
    console.error(
      "bouwsteen error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Beoordeling is even niet beschikbaar." },
      { status: 503 },
    );
  }
}
