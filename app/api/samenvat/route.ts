import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";
import {
  vindModel,
  standaardModel,
  type ModelConfig,
} from "@/lib/providers";
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

type Bericht = { van: "bot" | "ik"; tekst: string };
type Body = {
  berichten: Bericht[];
  bouwstenen: Record<string, string>;
  modelId?: string;
  actieveBouwsteen?: number;
};

const BOUWSTEEN_LIJST = [
  {
    n: 1,
    titel: "Personage",
    hint: "wie is de hoofdpersoon (naam, leeftijd, kracht, zwakte)",
  },
  {
    n: 2,
    titel: "Plek & sfeer",
    hint: "waar en wanneer speelt het (plaats, tijd, sfeer)",
  },
  { n: 3, titel: "Doel", hint: "wat wil het personage bereiken of vinden" },
  { n: 4, titel: "Conflict", hint: "wat staat in de weg (extern of intern)" },
  {
    n: 5,
    titel: "Verhaallijn",
    hint: "begin, midden, einde in drie korte zinnen",
  },
  { n: 6, titel: "Genre", hint: "welk soort verhaal en wat voor gevoel" },
];

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
        max_tokens: 400,
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
        max_tokens: 400,
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
        maxTokens: 400,
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

  if (
    body.bouwstenen &&
    Object.values(body.bouwstenen).some((v) =>
      tooLong(v, MAX_LENGTHS.bouwsteen),
    )
  ) {
    return NextResponse.json(
      { error: "Bouwsteen te lang." },
      { status: 400 },
    );
  }
  if (
    body.berichten &&
    (body.berichten.length > 30 ||
      body.berichten.some((m) => tooLong(m.tekst, MAX_LENGTHS.berichtTekst)))
  ) {
    return NextResponse.json(
      { error: "Bericht te lang." },
      { status: 400 },
    );
  }

  const leerlingInput = (body.berichten || []).filter(
    (m) => m.van === "ik" && m.tekst?.trim().length > 0,
  );
  if (leerlingInput.length === 0) {
    return NextResponse.json(
      {
        error:
          "Er is nog geen gesprek om samen te vatten. Stel eerst een vraag aan de coach.",
      },
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

  const bouwstenenCtx = BOUWSTEEN_LIJST.map((b) => {
    const huidig = clean(
      body.bouwstenen?.[String(b.n)],
      MAX_LENGTHS.bouwsteen,
    ).trim();
    return `${b.n}. ${b.titel} (${b.hint})${
      huidig ? ` — huidig: "${escapeQuotes(huidig)}"` : " — (nog leeg)"
    }`;
  }).join("\n");

  const gesprek = (body.berichten || [])
    .slice(-10)
    .map(
      (m) =>
        `${m.van === "ik" ? "Leerling" : "Coach"}: ${escapeQuotes(
          clean(m.tekst, MAX_LENGTHS.berichtTekst),
        )}`,
    )
    .join("\n\n");

  const system = `Je helpt Nederlandse VO-leerlingen (14-16) hun verhaal-bouwstenen in te vullen op basis van wat er in het coach-gesprek is besproken.

Geef UITSLUITEND een JSON-object terug, zonder uitleg ervoor of erna. Formaat:
{"bouwsteen": <getal 1-6>, "tekst": "<concrete zin voor die bouwsteen>"}

Regels:
- Kies het NUMMER (1-6) van de bouwsteen waar het besproken idee het beste bij past.
- De "tekst" is een korte concrete zin (max 150 tekens) die direct in de bouwsteen kan staan.
- Schrijf concreet (namen, leeftijden, details). Geen chatterij zoals "ik zou...".
- Nederlands, passend bij 14-16 jaar.
- Als de leerling al iets had ingevuld voor die bouwsteen, bouw er op voort in plaats van totaal anders.`;

  const actieveNoot =
    typeof body.actieveBouwsteen === "number" &&
    body.actieveBouwsteen >= 1 &&
    body.actieveBouwsteen <= 6
      ? `\nDe leerling werkte tijdens dit gesprek actief aan bouwsteen ${body.actieveBouwsteen}. Kies deze tenzij het gesprek duidelijk over een andere bouwsteen ging.\n`
      : "";

  const user = `Bouwstenen:
${bouwstenenCtx}
${actieveNoot}
Gesprek:
${gesprek}

Vat het idee uit dit gesprek samen voor de best passende bouwsteen.`;

  try {
    const raw = await callModel(model, system, user);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      console.error("samenvat: geen JSON gevonden in response");
      return NextResponse.json(
        { error: "Samenvatting niet gelukt." },
        { status: 503 },
      );
    }
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const bouwsteenNr =
      typeof parsed.bouwsteen === "number"
        ? parsed.bouwsteen
        : Number(parsed.bouwsteen);
    const tekst =
      typeof parsed.tekst === "string" ? parsed.tekst.trim() : "";
    if (!tekst || !bouwsteenNr || bouwsteenNr < 1 || bouwsteenNr > 6) {
      return NextResponse.json(
        { error: "Samenvatting niet bruikbaar." },
        { status: 503 },
      );
    }
    const resp = NextResponse.json({ bouwsteenNr, tekst });
    if (rl.cookieToSet) resp.headers.set("Set-Cookie", rl.cookieToSet);
    return resp;
  } catch (err) {
    console.error(
      "samenvat error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Samenvatting niet gelukt." },
      { status: 503 },
    );
  }
}
