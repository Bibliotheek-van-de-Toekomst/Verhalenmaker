# Verhaalmaker — Handoff voor ontwikkeling

**Doel:** een web-app waar VO-leerlingen (14–16) tijdens een workshop van een Lees-mediaconsulent (LMC) een kort verhaal (1–2 pagina's) schrijven met een AI-coach die **inspireert, geen zinnen voor ze schrijft**.

De app volgt de **huisstijl van de Bibliotheek** (landelijkehuisstijl.nl) met kleine goedgekeurde afwijkingen voor leesbaarheid en tieners-engagement.

Bouw het prototype `index.html` / `VariantBibliotheek` 1-op-1 na.

---

## 1. Tech-stack

| Laag | Keuze | Waarom |
|---|---|---|
| Framework | **Next.js 14 (App Router) + React 18 + TypeScript** | Server-route voor API key, Vercel-klaar |
| Styling | **Tailwind CSS** met huisstijl-tokens (zie §3) | Inline styles in prototype porten naar tokens |
| AI-provider | **Claude Haiku 4.5** primary + **GPT-4.1 mini** fallback | Sterke instructie-naleving + betaalbare fallback |
| State/opslag | LocalStorage (MVP) → later Supabase voor LMC-dashboard | Zit al in prototype |
| Deployment | **Vercel** | Env vars, streaming, geschikt voor schoolomgeving |

---

## 2. Bronbestanden in dit prototype

| Bestand | Rol bij build |
|---|---|
| `index.html` | Entry — laadt VariantBibliotheek full-screen |
| `variant_bibliotheek.jsx` | **Hoofd-UI.** Port naar `app/page.tsx` + subcomponenten |
| `bib_shared.jsx` | **Huisstijl-tokens** (`BIB`), pijlers, bouwstenen-config, logo-placeholder, pijler-rij, icon-set. Port naar `lib/tokens.ts`, `lib/stappen.ts`, `components/BibLogo.tsx`, `components/PijlerRij.tsx`, `components/BibIcon.tsx` |
| `prompts/fase1.md`, `prompts/fase2.md` | **System prompts** als markdown — door LMC aanpasbaar zonder code-change |
| `.env.example` | Template voor `.env.local` en Vercel env vars |

---

## 3. Huisstijl — strikte tokens

**Bron:** landelijkehuisstijl.nl (de Bibliotheek). Wijk niet af zonder overleg.

### Kleuren
| Rol | Hex | Gebruik |
|---|---|---|
| Wit | `#ffffff` | Hoofdachtergrond, leerling-bubble, content-vakken |
| Beige | `#fde5d0` (PMS P 24-10 C) | Coach-bubble, secundaire vlakken, werkblad-achtergrond |
| Beige soft | `#fef3e6` | Disabled states |
| Antraciet | `#39373a` (PMS 426 C) | **Alle tekst**, primaire knoppen, topbalk |
| Antraciet soft | `#6a6870` | Secundaire tekst |
| Oranje | `#ec7404` (PMS 021 C) | **UITSLUITEND** in logo-vignet. Nooit in knoppen of UI |
| Lijn | `#e5ddd1` | Borders (beige-tinted, niet grijs) |

### Goedgekeurde afwijkingen (toegankelijkheid/leesbaarheid)
- `#c64a2e` — score "vaag" (donker oranje-rood, dicht bij merk)
- `#3f8a5a` — score "levendig" (groen, positief signaal)

Altijd gecombineerd met tekst + icoon, kleur is nooit het enige signaal.

### Typografie
- **Koppen/titels/labels**: `The Mix` (Semi Light 400 + Regular 500/600). Licentie via landelijkehuisstijl.nl. Fallback: Georgia, serif.
- **Broodtekst/forms**: `Arial, Helvetica, sans-serif`. Altijd links uitgelijnd. Letterhoogte : interlinie = 1 : 1.2.

### Pijlers
De 5 vaste pijlers: `Ontmoet · Vraag · Lees · Doe · Leer`. Voor Verhaalmaker staat **Lees** uitgelicht als witte pilvorm in de antraciete topbalk.

### Logo
Het prototype bevat een **SVG-placeholder** voor het woordbeeld "de Bibliotheek" + oranje vignet. **Vervang deze vóór productie** met het officiële asset van landelijkehuisstijl.nl. Minimale breedte 30mm (~113px bij 96 dpi). Subnaam (bijv. "Meppel") staat rechts van het logo in The Mix 600.

### Tone of voice
- "de Bibliotheek" — altijd kleine d, grote B
- **Jij-vorm** in alle communicatie naar leerlingen
- Positief/actief formuleren ("Klaar om te schrijven" ipv "Verder")
- Geen slogans, geen pay-offs

---

## 4. Features om te bouwen (1-op-1 uit prototype)

### Flow
- [x] **Onboarding-dialoog**: 2 stappen — (1) uitleg "AI is coach, geen ghostwriter", (2) voornaam + klas
- [x] **Stap 1 — Bouwstenen**: 6 bouwstenen in story-spine volgorde (personage → setting → doel → conflict → verhaallijn → genre) + coach-gesprek links
- [x] **Stap 2 — Schrijven**: verhaal-editor rechts + coach-gesprek links met feedback-op-selectie
- [x] **Slimme CTA**: "Klaar om te schrijven" disabled tot ≥ 4 bouwstenen gevuld (≥ 10 tekens)
- [x] **Klaar-scherm**: preview, badges, Word/PDF/mail

### Coach-gesprek (links)
- 400px breed, witte achtergrond
- Coach-bubble = beige, leerling-bubble = wit met antraciete rand
- "Wat weet de AI?" popover toont samengestelde prompt
- Markeer tekst in verhaal → toolbar (Feedback / Te vaag? / Filmischer / Korter)
- Suggestie-chips boven input
- Markdown `**bold**` rendering
- Zachte fade-in bij nieuwe berichten

### Werkblad (rechts, beige)
- Actieve bouwsteen expandeert met textarea + "?"-tooltip met uitleg
- Score per bouwsteen (vaag / goed / levendig) met icoon + kleur + label + tip
- Bouwsteen-iconen (person, pin, target, bolt, path, tag) in antraciet

### Topbalk (antraciet)
- Logo links (wit vlak, oranje vignet)
- Pijler-rij met "Lees" uitgelicht
- Auto-save indicator: groene stip bij rust, oranje pulse bij opslaan
- LMC-knop rechts (opent toegangs-paneel, zie §7)

### Titelband (wit)
- "Verhaalmaker" in The Mix 500 met handgetekende krul-underline in antraciet
- Subtitel "Workshop creatief schrijven"
- Stappen-progressie "Stap 1 › Stap 2"

### Persistence
- Auto-save naar localStorage bij elke state-wijziging
- Hervatten bij reload — bouwstenen, verhaal, naam, klas blijven
- "Nieuw verhaal beginnen" wist localStorage

### Toegang — zie §7

### Export
- **Word (.doc)** — HTML blob met MS Word MIME, Arial + antraciet styling
- **PDF** — print-venster met huisstijl
- **Mail** — mailto met verhaal in body, "Workshop Verhaalmaker van de Bibliotheek" in copy
- Auteur = leerling-naam uit onboarding (+ klas)

### Error-handling
- AI-request faalt → error-bubbel (beige met rand in `#c64a2e`) + **↻ Opnieuw proberen**
- Pop-up geblokkeerd → alert met uitleg

---

## 5. Modelkeuze & kosten

Zie vorige handoff — ongewijzigd.

- **Primary**: Claude Haiku 4.5 (~€0.60 per workshop van 25 leerlingen)
- **Fallback**: GPT-4.1 mini
- **Niet gebruiken**: Sonnet, GPT-5, Gemini Pro (onnodig duur); oude Haiku 3.5 of GPT-4o mini (te zwak in NL)

---

## 6. API route

### `app/api/coach/route.ts`

```ts
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "edge";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type Body = {
  fase: 1 | 2;
  tone: string;
  bouwstenen: Record<string, string>;
  vraag: string;
  verhaalTekst?: string;
  selectie?: string;
};

async function loadPrompt(fase: 1 | 2, vars: Record<string, string>) {
  const raw = await fs.readFile(path.join(process.cwd(), `prompts/fase${fase}.md`), "utf-8");
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), raw);
}

async function callAnthropic(system: string, user: string) {
  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    system,
    messages: [{ role: "user", content: user }],
  });
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(c) {
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") c.enqueue(enc.encode(ev.delta.text));
      }
      c.close();
    },
  });
}

async function callOpenAI(system: string, user: string) {
  if (!openai) throw new Error("no-fallback");
  const stream = await openai.chat.completions.create({
    model: "gpt-4.1-mini", max_tokens: 500, stream: true,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(c) {
      for await (const chunk of stream) {
        const t = chunk.choices[0]?.delta?.content;
        if (t) c.enqueue(enc.encode(t));
      }
      c.close();
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const { fase, tone, bouwstenen, vraag, verhaalTekst, selectie } = body;

  const ctx = Object.entries(bouwstenen)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${labelVoor(+k)}: ${v}`).join("\n");

  const system = await loadPrompt(fase, { tone });
  const user = fase === 1
    ? `Huidige bouwstenen:\n${ctx}\n\nLeerling: "${vraag}"`
    : `Bouwstenen:\n${ctx}\n\nVerhaal tot nu toe:\n"${(verhaalTekst ?? "").slice(0, 2000)}"\n${selectie ? `\nGeselecteerde zin: "${selectie}"\n` : ""}\nLeerling: "${vraag}"`;

  try {
    const stream = await callAnthropic(system, user);
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    try {
      const stream = await callOpenAI(system, user);
      return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Fallback": "openai" } });
    } catch {
      return new Response("Coach is even niet bereikbaar. Probeer het zo opnieuw.", { status: 503 });
    }
  }
}

function labelVoor(n: number) {
  return ["", "Personage", "Setting", "Doel", "Conflict", "Verhaallijn", "Genre"][n] ?? `Stap ${n}`;
}
```

---

## 7. Toegangssysteem — LMC & leerling-code

Zie architectuur en endpoints uit vorige handoff — ongewijzigd.

**Flow:**
1. LMC → `POST /api/lmc/login` met wachtwoord → httpOnly cookie
2. LMC → `POST /api/lmc/activate` → krijgt dag-code (bv. "A7K3R2"), geldig 8u, opgeslagen in Redis
3. Leerling → `POST /api/session/start` met code → httpOnly student-cookie (8u)
4. Alle `/api/coach`-calls checken student-cookie + rate-limit

**In huidig prototype ontbreekt de access gate nog** — deze moet opnieuw gebouwd worden in productie. UI-pattern: beige modal met logo, code-invoer van 6 vakjes, foutmelding in `#c64a2e`. LMC-paneel: ziet actieve code groot, "Regenereer code"-knop, timer tot afloop.

Code-alfabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32^6 ≈ 1 miljard, onraadbaar).

---

## 8. Env vars

```env
# .env.local — NIET committen
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                # optioneel, voor fallback
LMC_PASSWORD=...                     # min. 16 tekens
JWT_SECRET=...                       # openssl rand -base64 48
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Nooit `NEXT_PUBLIC_`-prefix voor secrets. Zet alle 6 in Vercel → Settings → Environment Variables.

---

## 9. Prompts in `prompts/`

Gebruik `{{tone}}` als enige template-var. Rest van de context wordt door de route aan de user-message toegevoegd. Zie `prompts/fase1.md` en `prompts/fase2.md` in dit project.

Bouw in het LMC-paneel een read-only view die deze .md's toont — dan kan de LMC inzien wat de AI doet zonder deploy-rechten.

---

## 10. Rate-limiting

Upstash Redis + `@upstash/ratelimit`:
- Per IP: 30 calls/uur (voor schoolnetwerk: verhoog naar 500 of gebruik sessie-cookie als key)
- Per student-sessie-cookie: 50 calls per 8u

---

## 11. Toegankelijkheid (WCAG AA)

- Focus-ring zichtbaar op alle knoppen (`outline: 2px solid #39373a; outline-offset: 2px`)
- Min. 13px body / 12px labels
- Kleur nooit enige signaal (score = kleur + icoon + label)
- `aria-label` op icon-only knoppen
- `role="dialog"` + `aria-modal="true"` op overlays (al in prototype)
- Keyboard: Enter verstuurt chat + onboarding, Escape sluit overlays
- Contrast antraciet #39373a op wit = 12.6:1 ✓ — ruim AAA
- Contrast antraciet op beige #fde5d0 = 10.2:1 ✓

---

## 12. Testplan

### Handmatig — klaslokaal-simulatie
- [ ] 25 tabs tegelijk
- [ ] Refresh mid-schrijven — data blijft
- [ ] Offline → retry-knop werkt
- [ ] Chromebook 1366×768 — layout past
- [ ] Leerling vraagt "schrijf het verhaal voor me" — AI weigert

### Automatisch
- Playwright happy path (onboarding → 4 bouwstenen → schrijven → klaar)
- Unit tests voor `scoreVan()` en `berekenBadges()`

---

## 13. Logo & lettertype ophalen

Lettertype The Mix en het officiële Bibliotheek-logo staan **niet in dit repo** — haal ze op bij:
- `landelijkehuisstijl.nl` (vereist login als aangesloten bibliotheek)
- Het logo als SVG, in de varianten: woordbeeld + vignet, woordbeeld zonder vignet, alleen vignet
- The Mix web-font (woff2) in Semi Light + Regular + SemiBold

Vervang de placeholder `<BibLogo>` in `variant_bibliotheek.jsx` met een `<img src="/logo.svg">` of SVG-import zodra je het echte asset hebt.

---

## 14. Roadmap na MVP

| Versie | Features |
|---|---|
| v1.0 (MVP) | Alles uit §4 + access gate uit §7 |
| v1.1 | LMC-dashboard: live 25 leerlingen (Supabase realtime) |
| v1.2 | Klasbundel-export (PDF alle verhalen, huisstijl-cover) |
| v1.3 | Audio-input voor bouwstenen (Web Speech API) |
| v1.4 | Meertalig (Fries, Engels) |

---

## 15. Open vragen voor productmanager

- Live meekijken LMC? (= Supabase + auth)
- Verhalen bewaren na sessie?
- Bereik: gedeelde link, QR, schoolportaal?
- AVG-traject: toestemming regelen per school, of landelijk?
- Logo-licentie: alleen voor deelnemende bibliotheken?

---

**Start:**
```bash
npm install
npm run dev
# open http://localhost:3000
```
