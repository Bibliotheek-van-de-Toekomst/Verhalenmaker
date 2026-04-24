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
      host === "localhost:3000" ||
      host === "localhost" ||
      host === "127.0.0.1:3000" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}
