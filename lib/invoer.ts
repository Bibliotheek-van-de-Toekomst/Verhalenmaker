// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


export const MAX_LENGTHS = {
  vraag: 1000,
  selectie: 500,
  bouwsteen: 500,
  verhaalTekst: 2500,
  tone: 100,
  berichtTekst: 2000,
} as const;

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

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.host.toLowerCase();
    return (
      host.endsWith(".vercel.app") ||
      host.endsWith(".brainportbibliotheken.nl") ||
      host === "brainportbibliotheken.nl" ||
      host === "localhost:3000" ||
      host === "localhost" ||
      host === "127.0.0.1:3000" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}
