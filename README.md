# Verhaalmaker — de Bibliotheek

Web-app waar VO-leerlingen (14–16) een kort verhaal schrijven met een AI-coach
die **inspireert, geen zinnen voor ze schrijft**. Huisstijl: de Bibliotheek.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS (huisstijl-tokens in `tailwind.config.ts`)
- Multi-LLM via `lib/providers.ts` — Claude Haiku 4.5, GPT-4.1 mini,
  Mistral Small, Ministral 8B (alleen goedkope modellen)
- LocalStorage voor state + auto-save
- Deploy op Vercel

## Aan de slag (lokaal)

```bash
npm install
cp .env.example .env.local
# vul minstens één API key in (.env.local)
npm run dev
# open http://localhost:3000
```

## Environment variables

Minstens één van deze API keys is verplicht:

| Variabele            | Waarvoor                              |
| -------------------- | ------------------------------------- |
| `ANTHROPIC_API_KEY`  | Claude Haiku 4.5                      |
| `OPENAI_API_KEY`     | GPT-4.1 mini                          |
| `MISTRAL_API_KEY`    | Mistral Small / Ministral 8B          |

Optioneel:

| Variabele                  | Effect                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| `LMC_TOEGESTANE_MODELLEN`  | Komma-lijst van model-ids die leerlingen mogen kiezen. Leeg = alles.  |
| `STANDAARD_MODEL`          | Model dat voorgeselecteerd is bij eerste bezoek.                      |

Model-ids: `claude-haiku-4-5`, `gpt-4-1-mini`, `mistral-small`, `ministral-8b`.

## Model-keuze (door LMC of leerling)

- **Alleen providers met een API key** verschijnen in de selector.
- **LMC beperkt** de lijst optioneel via `LMC_TOEGESTANE_MODELLEN`.
- **Leerling kiest** in de topbalk ("AI: …"). Keuze blijft bewaard in
  localStorage.
- Voorbeeld: zet alleen `ANTHROPIC_API_KEY` → leerlingen zien alleen Haiku.

## Deploy naar Vercel

1. Push deze map naar GitHub.
2. Importeer in Vercel (framework detecteert automatisch Next.js).
3. Zet de env vars onder **Settings → Environment Variables**.
4. Deploy.

Runtime staat op `nodejs` (niet `edge`) zodat we de prompts via `fs` kunnen
lezen en de Mistral-SDK stabiel werkt.

## Prompts aanpassen zonder deploy

De prompts staan als Markdown in `prompts/fase1.md` en `prompts/fase2.md`.
Alleen `{{tone}}` wordt vervangen; alle andere context (bouwstenen, verhaal,
selectie, vraag) voegt de route toe aan de user-message.

## Wat er NOG NIET in zit (bewust, voor MVP)

- **Access gate + dag-codes** (§7 van de handoff) — vereist Upstash Redis.
- **Rate-limiting** — zelfde reden.
- **LMC-paneel** — de selector in de topbalk laat student kiezen. LMC beperkt
  de lijst via env var.
- **Echte logo- en The-Mix-assets** — placeholder SVG uit prototype. Vervang
  vóór productie (zie HANDOFF §13).

## Projectstructuur

```
app/
  api/coach/route.ts     Streaming multi-LLM endpoint
  api/models/route.ts    Lijst beschikbare modellen
  layout.tsx, page.tsx   Shell + entry
components/
  VerhaalMaker.tsx       Hoofd-UI (hoofdcomponent)
  BibOnboarding.tsx      2-staps welkom-modal
  BibKlaarScherm.tsx     Klaar-scherm met exports
  ModelSelector.tsx      Dropdown met AI-modellen
  Bib{Logo,Icon,...}.tsx Huisstijl-bouwstenen
lib/
  tokens.ts              BIB-kleuren en fonts
  stappen.ts             6 bouwstenen
  providers.ts           Multi-LLM registry
prompts/
  fase1.md, fase2.md     System prompts (LMC-aanpasbaar)
```
