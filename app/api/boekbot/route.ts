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
export const dynamic = "force-dynamic";

type Body = {
  bouwstenen: Record<string, string>;
  modelId?: string;
};

const MAX_TOKENS = 160;

// Boekbot weigert lange berichten. De zoekvraag moet dus kort blijven, ook als
// het model zich niet aan de woordgrens houdt.
const MAX_ZOEKVRAAG = 240;

async function loadPrompt() {
  return fs.readFile(
    path.join(process.cwd(), "prompts", "boekbot.md"),
    "utf-8",
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

function parseZoekvraag(ruw: string): string | null {
  const start = ruw.indexOf("{");
  const eind = ruw.lastIndexOf("}");
  if (start === -1 || eind <= start) return null;
  try {
    const data = JSON.parse(ruw.slice(start, eind + 1));
    let zoekvraag = clean(String(data?.zoekvraag ?? ""))
      .replace(/\s+/g, " ")
      .trim();
    // Afkappen op een woordgrens, anders eindigt de zoekvraag halverwege een
    // woord zodra een model de woordgrens overschrijdt.
    if (zoekvraag.length > MAX_ZOEKVRAAG) {
      const kort = zoekvraag.slice(0, MAX_ZOEKVRAAG);
      const spatie = kort.lastIndexOf(" ");
      zoekvraag = (spatie > 60 ? kort.slice(0, spatie) : kort).trim();
    }
    return zoekvraag.length >= 20 ? zoekvraag : null;
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

  const bouwstenen = body.bouwstenen || {};
  if (
    Object.values(bouwstenen).some((v) => tooLong(v, MAX_LENGTHS.bouwsteen))
  ) {
    return NextResponse.json(
      { error: "Bouwsteen te lang." },
      { status: 400 },
    );
  }

  const ctx = BIB_STAPPEN.map((s) => {
    const v = clean(bouwstenen[String(s.n)], MAX_LENGTHS.bouwsteen).trim();
    return v ? `${s.titel}: ${escapeQuotes(v)}` : "";
  })
    .filter(Boolean)
    .join("\n");

  if (!ctx) {
    return NextResponse.json(
      { error: "Vul eerst een paar bouwstenen in." },
      { status: 400 },
    );
  }

  const model =
    (body.modelId ? vindModel(body.modelId) : null) ?? standaardModel();
  if (!model) {
    return NextResponse.json(
      { error: "Geen AI-model beschikbaar." },
      { status: 503 },
    );
  }

  const system = await loadPrompt();
  const user = `Bouwstenen van de leerling:\n${ctx}\n\nGeef de zoekvraag als JSON.`;

  try {
    let ruw: string;
    try {
      ruw = await callModel(model, system, user);
    } catch {
      await new Promise((r) => setTimeout(r, 400));
      ruw = await callModel(model, system, user);
    }
    const zoekvraag = parseZoekvraag(ruw);
    if (!zoekvraag) {
      return NextResponse.json(
        { error: "De samenvatting is niet gelukt." },
        { status: 503 },
      );
    }
    const resp = NextResponse.json({ zoekvraag });
    if (rl.cookieToSet) resp.headers.set("Set-Cookie", rl.cookieToSet);
    return resp;
  } catch (err) {
    console.error(
      "boekbot error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "De samenvatting is even niet beschikbaar." },
      { status: 503 },
    );
  }
}
