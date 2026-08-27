// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

// Limieten op één plek: de Redis-limiter en de noodrem hieronder moeten
// dezelfde grenzen hanteren, anders verandert het gedrag stilletjes zodra
// Upstash wegvalt. Ruim voor een klas achter één schoolgateway.
const IP_MAX = 1000;
const IP_VENSTER = "1 h" as const;
const IP_VENSTER_MS = 60 * 60 * 1000;
const SESS_MAX = 200;
const SESS_VENSTER = "8 h" as const;
const SESS_VENSTER_MS = 8 * 60 * 60 * 1000;

let ipLimiter: Ratelimit | null = null;
let sessLimiter: Ratelimit | null = null;
let geinitialiseerd = false;

function init() {
  if (geinitialiseerd) return;
  geinitialiseerd = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "Rate-limiting UIT: UPSTASH_REDIS_REST_URL/TOKEN niet gezet.",
    );
    return;
  }
  const redis = new Redis({ url, token });
  ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(IP_MAX, IP_VENSTER),
    prefix: "rl:ip",
    analytics: false,
  });
  sessLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(SESS_MAX, SESS_VENSTER),
    prefix: "rl:sess",
    analytics: false,
  });
}

type Teller = { aantal: number; reset: number };

// Noodrem voor als Upstash onbereikbaar is. Tellers leven in het geheugen van
// één server-instantie, dus over meerdere instanties heen telt hij te ruim.
// Genoeg om een aanhoudende stroom van één bron te stuiten, en dat is precies
// waar hij voor bedoeld is: bescherming houden zonder de workshop plat te leggen.
const noodremIp = new Map<string, Teller>();
const noodremSess = new Map<string, Teller>();
let storingGemeld = false;

function noodremTelt(
  tellers: Map<string, Teller>,
  sleutel: string,
  max: number,
  vensterMs: number,
): { ok: boolean; resetInSec: number } {
  const nu = Date.now();

  // Verlopen tellers opruimen zodra de map groot wordt, zodat het geheugen
  // van een langlopende instantie niet onbeperkt aangroeit.
  if (tellers.size > 5000) {
    for (const [k, t] of tellers) {
      if (nu >= t.reset) tellers.delete(k);
    }
  }

  let teller = tellers.get(sleutel);
  if (!teller || nu >= teller.reset) {
    teller = { aantal: 0, reset: nu + vensterMs };
    tellers.set(sleutel, teller);
  }
  teller.aantal++;
  return {
    ok: teller.aantal <= max,
    resetInSec: Math.max(0, Math.ceil((teller.reset - nu) / 1000)),
  };
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const eerste = fwd.split(",")[0]?.trim();
    if (eerste) return eerste;
  }
  return req.headers.get("x-real-ip") ?? "anoniem";
}

export type RateCheck =
  | { ok: true; cookieToSet?: string }
  | {
      ok: false;
      reden: "ip" | "sess";
      resetInSec: number;
      cookieToSet?: string;
    };

export async function checkRateLimit(req: NextRequest): Promise<RateCheck> {
  init();
  if (!ipLimiter || !sessLimiter) {
    return { ok: true };
  }
  const ip = getIp(req);
  let sess = req.cookies.get("vm_sess")?.value;
  let cookieToSet: string | undefined;
  if (!sess) {
    sess = crypto.randomUUID();
    cookieToSet = `vm_sess=${sess}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      60 * 60 * 8
    }; Secure`;
  }
  let ipResult, sessResult;
  try {
    [ipResult, sessResult] = await Promise.all([
      ipLimiter.limit(ip),
      sessLimiter.limit(sess),
    ]);
  } catch (err) {
    // Redis onbereikbaar (verkeerde credentials, verwijderde database, netwerk).
    // Niet het hele verzoek laten sneuvelen, maar terugvallen op de noodrem.
    if (!storingGemeld) {
      storingGemeld = true;
      console.error(
        "Upstash onbereikbaar, noodrem actief —",
        err instanceof Error ? err.message : err,
      );
    }
    const ipNood = noodremTelt(noodremIp, ip, IP_MAX, IP_VENSTER_MS);
    if (!ipNood.ok) {
      return {
        ok: false,
        reden: "ip",
        resetInSec: ipNood.resetInSec,
        cookieToSet,
      };
    }
    const sessNood = noodremTelt(
      noodremSess,
      sess,
      SESS_MAX,
      SESS_VENSTER_MS,
    );
    if (!sessNood.ok) {
      return {
        ok: false,
        reden: "sess",
        resetInSec: sessNood.resetInSec,
        cookieToSet,
      };
    }
    return { ok: true, cookieToSet };
  }
  if (!ipResult.success) {
    return {
      ok: false,
      reden: "ip",
      resetInSec: Math.max(
        0,
        Math.floor((ipResult.reset - Date.now()) / 1000),
      ),
      cookieToSet,
    };
  }
  if (!sessResult.success) {
    return {
      ok: false,
      reden: "sess",
      resetInSec: Math.max(
        0,
        Math.floor((sessResult.reset - Date.now()) / 1000),
      ),
      cookieToSet,
    };
  }
  return { ok: true, cookieToSet };
}

export function rateLimitFoutmelding(reden: "ip" | "sess", resetSec: number) {
  const minuten = Math.max(1, Math.ceil(resetSec / 60));
  if (reden === "sess") {
    return `Je hebt de limiet voor deze sessie bereikt. Probeer over ${minuten} minuten opnieuw, of wacht tot de workshop voorbij is.`;
  }
  return `De klas heeft momenteel veel verzoeken. Wacht ongeveer ${minuten} minuten voordat je weer vraagt.`;
}
