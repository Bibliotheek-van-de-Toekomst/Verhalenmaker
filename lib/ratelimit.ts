import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

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
    limiter: Ratelimit.slidingWindow(1000, "1 h"),
    prefix: "rl:ip",
    analytics: false,
  });
  sessLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, "8 h"),
    prefix: "rl:sess",
    analytics: false,
  });
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
  const [ipResult, sessResult] = await Promise.all([
    ipLimiter.limit(ip),
    sessLimiter.limit(sess),
  ]);
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
