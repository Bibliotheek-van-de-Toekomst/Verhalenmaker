// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


// Een verhaal beslaat maximaal 1 A4. Bij een gebruikelijke schoolopmaak is dat
// zo'n 600 woorden, en gemeten aan de uitvoer van deze app komt een woord op
// ongeveer 5,7 tekens inclusief spatie. Dat is grofweg 3400 tekens; met marge
// voor doorschrijven staat de grens op 4000. Boven deze grens leest de AI niet
// alles mee, boven 4500 (deze waarde plus 500) weigert hij het verzoek.
export const MAX_LENGTHS = {
  vraag: 1000,
  selectie: 500,
  bouwsteen: 500,
  verhaalTekst: 4000,
  tone: 100,
  berichtTekst: 2000,
} as const;

// Hoeveel tekens een woord gemiddeld beslaat, gemeten aan echte uitvoer.
// Gebruikt om de tekengrens in woorden uit te drukken voor de leerling.
export const TEKENS_PER_WOORD = 5.7;

export function clean(
  s: string | undefined | null,
  maxLen?: number,
): string {
  if (typeof s !== "string") return "";
  const stripped = s.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    "",
  );
  return maxLen !== undefined ? stripped.slice(0, maxLen) : stripped;
}

export function escapeQuotes(s: string): string {
  return s.replace(/"/g, "\u201C");
}

export function tooLong(
  s: string | undefined | null,
  maxLen: number,
): boolean {
  return typeof s === "string" && s.length > maxLen;
}

// Adressen op vercel.app die bij dit project horen: het vaste adres en de
// proefversies die Vercel per commit of branch aanmaakt. Vercel vult deze
// variabelen zelf in. Elke andere site op vercel.app is van iemand anders.
function eigenVercelHosts(): string[] {
  return [
    "verhalenmaker.vercel.app",
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter((h): h is string => !!h)
    .map((h) => h.toLowerCase());
}

// Alle AI-routes zijn POST-verzoeken, en een browser stuurt daarbij altijd een
// Origin-header mee. Een verzoek zonder Origin komt dus niet uit de app.
// Let op: een script kan de header vervalsen. Deze controle houdt andere
// websites tegen; de limiet op verzoeken blijft de rem op misbruik.
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.host.toLowerCase();
    if (process.env.NODE_ENV !== "production") {
      if (host === "localhost:3000" || host === "127.0.0.1:3000") return true;
    }
    if (url.protocol !== "https:") return false;
    return (
      host === "brainportbibliotheken.nl" ||
      host.endsWith(".brainportbibliotheken.nl") ||
      eigenVercelHosts().includes(host)
    );
  } catch {
    return false;
  }
}
