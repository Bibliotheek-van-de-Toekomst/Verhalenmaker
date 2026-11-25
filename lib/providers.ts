// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


export type ProviderId = "anthropic" | "openai" | "mistral";

export type ModelConfig = {
  id: string;
  label: string;
  provider: ProviderId;
  modelId: string;
  envKey: string;
  beschrijving: string;
};

// Alleen goedkope, niet-reasoning modellen — geschikt voor een schoolworkshop.
// Per aanbieder het goedkoopste model dat de coachregels goed volgt.
// Eerste item is de default als STANDAARD_MODEL env var niet is gezet.
export const ALLE_MODELLEN: ModelConfig[] = [
  {
    id: "ministral-8b",
    label: "Ministral 8B",
    provider: "mistral",
    modelId: "ministral-8b-latest",
    envKey: "MISTRAL_API_KEY",
    beschrijving: "Europees en goedkoop. Aanbevolen standaard voor de workshop.",
  },
  {
    id: "claude-haiku-5-5",
    label: "Claude Haiku 5.5",
    provider: "anthropic",
    modelId: "claude-haiku-5-5",
    envKey: "ANTHROPIC_API_KEY",
    beschrijving: "Snel en sterk in Nederlands.",
  },
  {
    id: "gpt-6-luna",
    label: "GPT-6 Luna",
    provider: "openai",
    modelId: "gpt-6-luna",
    envKey: "OPENAI_API_KEY",
    beschrijving: "Het goedkope model van OpenAI. Goede Nederlandse output.",
  },
];

// Claude Haiku 5.5 denkt standaard eerst na, en dat nadenken telt mee in
// max_tokens. Bij de korte antwoorden van deze app zou het antwoord dan
// wegvallen, dus staat het uit. Daarnaast telt dit model dezelfde tekst als
// ongeveer 30% meer tokens dan Haiku 4.5; de grens schuift daarom mee.
export function anthropicOpties(maxTokens: number) {
  return {
    max_tokens: Math.ceil(maxTokens * 1.3),
    thinking: { type: "disabled" as const },
  };
}

// GPT-6 Luna denkt standaard eerst na, en dat denken telt mee in
// max_completion_tokens. Bij een krappe grens bleef er soms niets over voor
// het antwoord zelf. Voor deze korte taken is nadenken niet nodig.
export function openaiOpties(maxTokens: number) {
  return {
    max_completion_tokens: maxTokens,
    reasoning_effort: "none" as const,
  };
}

// Model-ids van voor de wissel van november 2026. Ze kunnen nog in de
// env-variabelen op Vercel staan; zonder deze vertaling zou een oude lijst
// alle nieuwe modellen verbergen.
const OUDE_IDS: Record<string, string> = {
  "mistral-small": "ministral-8b",
  "claude-haiku-4-5": "claude-haiku-5-5",
  "gpt-4-1-mini": "gpt-6-luna",
};

function huidigId(id: string): string {
  return OUDE_IDS[id] ?? id;
}

function toegestaneLijst(): string[] | null {
  const raw = process.env.LMC_TOEGESTANE_MODELLEN;
  if (!raw) return null;
  const lijst = raw
    .split(",")
    .map((s) => huidigId(s.trim()))
    .filter(Boolean);
  return lijst.length ? lijst : null;
}

export function beschikbareModellen(): ModelConfig[] {
  const toegestaan = toegestaneLijst();
  return ALLE_MODELLEN.filter((m) => {
    if (!process.env[m.envKey]) return false;
    if (toegestaan && !toegestaan.includes(m.id)) return false;
    return true;
  });
}

export function standaardModel(): ModelConfig | null {
  const lijst = beschikbareModellen();
  if (lijst.length === 0) return null;
  const gekozen = process.env.STANDAARD_MODEL;
  if (gekozen) {
    const match = lijst.find((m) => m.id === huidigId(gekozen));
    if (match) return match;
  }
  return lijst[0];
}

export function vindModel(id: string): ModelConfig | null {
  return beschikbareModellen().find((m) => m.id === huidigId(id)) ?? null;
}
