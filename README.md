# Verhaalmaker — de Bibliotheek

Web-app waar VO-leerlingen (14–16) een kort verhaal schrijven met een AI die
**óf coacht (de leerling schrijft zelf) óf zelf schrijft** (de leerling stuurt
op afstand met aanwijzingen). Huisstijl: de Bibliotheek.

## Doel van dit document

Dit README is bedoeld om aan **leesmediacoaches (LMCs)** voor te leggen ter
feedback, zowel op het **ontwerp van de app** (workflow, knoppen, schermen)
als op het **gedrag van de chatbot** (wat de AI wel/niet zegt, hoe streng of
losjes hij is, hoe hij omgaat met afwijkende verzoeken).

Specifiek welkom is feedback op:

- De **workflow** (zes bouwstenen → schrijfmodus kiezen → klaar-scherm met
  Boekbot-prompt). Mist er een stap? Wringt de volgorde?
- De **twee schrijfmodi**: zijn beide opties duidelijk voor leerlingen? Doet
  de AI het juiste in elke modus?
- De **content-grenzen** (zie *Gedrag van de AI* hieronder): zit de
  bandbreedte tussen "te preuts" en "te plat" goed voor het Nederlandse
  voortgezet onderwijs?
- De **bouwstenen** zelf: zijn de zes stappen (personage, plek & sfeer,
  doel, conflict, verhaallijn, genre) de juiste, en zijn de hints + de
  voorbeelden goed gekozen voor de doelgroep?

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS (huisstijl-tokens in `tailwind.config.ts`)
- Multi-LLM via `lib/providers.ts` — Claude Haiku 4.5, GPT-4.1 mini,
  Mistral Small, Ministral 8B (alleen goedkope modellen)
- LocalStorage voor state + auto-save
- Streaming responses (Server-Sent Events via `ReadableStream`)
- Upstash Redis voor rate-limiting (IP + sessie)
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

| Variabele                    | Effect                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `LMC_TOEGESTANE_MODELLEN`    | Komma-lijst van model-ids die leerlingen mogen kiezen. Leeg = alles.            |
| `STANDAARD_MODEL`            | Model dat voorgeselecteerd is bij eerste bezoek.                                |
| `UPSTASH_REDIS_REST_URL`     | Inschakelen van rate-limiting (samen met token).                                |
| `UPSTASH_REDIS_REST_TOKEN`   | Idem.                                                                           |

Model-ids: `claude-haiku-4-5`, `gpt-4-1-mini`, `mistral-small`, `ministral-8b`.

> **Let op**: zet comments in `.env.local` op een eigen regel (`# kommentaar`
> boven de waarde), niet achter dezelfde regel als de waarde. De Next-dotenv-
> parser kan struikelen op inline comments achter sommige waardes, waardoor de
> betreffende provider stilletjes uit de modellenlijst verdwijnt.

## Workflow (wat de leerling doet)

1. **Onboarding** (`BibOnboarding`)
   - Welkomstscherm legt uit dat de AI helpt als coach óf als schrijver.
   - Leerling vult haar voornaam in. Daarna wordt die naam automatisch onder
     het verhaal gezet als auteur.

2. **Stap 1 — Bouwstenen verzamelen** (fase 1)
   - Zes bouwstenen, ingedeeld als kaarten op het werkblad rechts:
     1. Personage 2. Plek & sfeer 3. Doel 4. Conflict 5. Verhaallijn 6. Genre
   - Per bouwsteen geeft de coach (links) gerichte tegenvragen, hints en
     voorbeelden. Bij elk antwoord beslist de coach via de tag
     `[[bouwsteen: 1-6|geen]]` of er nu iets concreets uit het gesprek in een
     bouwsteen kan; zo ja, dan verschijnt onder dat botbericht een knop
     **↗ Gebruik voor een bouwsteen** die `/api/samenvat` aanroept om er een
     korte zin uit te destilleren.
   - Bij minimaal 4 ingevulde bouwstenen wordt de **Klaar om te schrijven →**
     knop actief; bij alle 6 wordt ook de AI-schrijven-knop in stap 2 actief.

3. **Stap 2 — Verhaal schrijven** (fase 2)

   In fase 2 kiest de leerling éénmalig (en kan altijd terugswitchen) tussen
   twee modi:

   - **Zelf schrijven** — de leerling typt zelf in het verhaal-veld. De coach
     in het linkerpaneel geeft tips, weigert kant-en-klare zinnen voor te
     schrijven (gouden regel in `prompts/fase2.md`). Een geselecteerde zin
     krijgt direct snelle feedback-knoppen.
   - **AI laat schrijven** — alleen beschikbaar als alle 6 bouwstenen zijn
     ingevuld. Klikken triggert `/api/genereer`: een aparte route die op basis
     van de bouwstenen een verhaal van ~200–300 woorden op B1-niveau streamt
     direct in het verhaal-veld. Daarna gaat de coach in **schrijver-modus**
     (zie hieronder) en kan de leerling in de chat aanpassingen vragen
     ("maak het langer", "voeg een spannende scène toe", "verander het einde").
     Bij elk AI-antwoord met een nieuwe versie verschijnt een inline knop
     **↗ Plaats deze versie in mijn verhaal**.

4. **Klaar-scherm** (`BibKlaarScherm`)
   - Editable titel-input (rode hint als titel ontbreekt).
   - Medailles overzicht.
   - **Boekbot-prompt** sectie: knop maakt een prompt op basis van titel +
     bouwstenen die je in [Boekbot.nl](https://Boekbot.nl) kunt plakken om
     een passend bestaand jeugdboek te vinden. Eventueel directe link.
   - Exporteren als Word, PDF, of mailen.
   - Handmatige backup-download als `.txt` (vangnet bij browserissues).

## Gedrag van de AI

De volledige instructies aan de AI staan in [`prompts/`](prompts/) — vier
Markdown-bestanden, één per modus. Deze sectie is een samenvatting in
gewone taal, om voor te leggen aan LMCs.

### Coach-modus (de leerling schrijft zelf)

- **Gouden regel**: de coach **schrijft NOOIT zinnen of alinea's voor** die
  de leerling kan overnemen, ook niet op verzoek. Vraagt de leerling
  *"schrijf de openingszin voor mij"*, dan weigert de coach vriendelijk en
  geeft in plaats daarvan een **vraag** of een **soort-suggestie** ("probeer
  een korte zin na een lange", "begin met een geluid").
- **Werkritme**: bij het eerste contact over een bouwsteen stelt de coach
  open tegenvragen die concrete details oproepen (naam, leeftijd, zintuigen,
  contrast). Pas in vervolg-antwoorden synthetiseert hij wat er sterk is en
  wat nog vaag — daar verschijnt onder dat antwoord de knop *↗ Gebruik voor
  een bouwsteen*.
- **Soorten feedback** die de coach mag geven: "te vaag" (welk detail mist?),
  "show don't tell" (hoe merk je dat aan zijn lichaam?), "ritme" (lange zin,
  korte zin), "zintuigen" (hoor je iets, ruik je iets?), "actiewoord" (wissel
  *was* of *ging* voor iets specifiekers).
- **Geen spelfoutcorrectie** in fase 2 — bewust, "laat de creativiteit
  stromen". Spelling kan later.

### Schrijver-modus (de AI schrijft mee)

- **Schrijft wél hele verhalen**, expliciet aangeboden als alternatief voor
  de leerling die niet zelf wil/kan schrijven. Eerste versie is ~200–300
  woorden op B1-niveau, gegenereerd uit de zes bouwstenen.
- **Bij elk vervolg-verzoek** ("maak het langer", "verander het einde",
  "voeg een spannende scène toe") levert de AI een **complete nieuwe
  versie** terug. Een korte uitleg ervóór ("Ik heb 'm langer gemaakt en meer
  zintuigen toegevoegd") + de tekst zelf achter een marker. Onder dat
  antwoord verschijnt *↗ Plaats deze versie in mijn verhaal*.
- **Bouwsteen wint bij conflict**: als de leerling een bouwsteen achteraf
  wijzigt en de oude verhaaltekst klopt niet meer, herschrijft de AI bij het
  volgende verzoek de afwijkende delen — ook als de leerling daar niet
  expliciet om vraagt.
- **De AI past zelf geen bouwstenen aan**. Vraagt de leerling daarom
  ("verander Lise in een ouder personage"), dan verwijst de AI naar de
  *← terug naar werkblad* knop in de bouwstenen-balk.

### Wat de AI wel en niet schrijft (content-grenzen)

Geldt vooral voor **schrijver-modus** en **eerste-versie-generator**, omdat
de coach geen verhaaltekst produceert.

**Wel toegestaan** (passend bij wat NL VO-leerlingen op school al lezen):

- Spanning, mystery, dood, een lijk, geesten, ruzie, gevecht, achtervolging
- Verliefdheid, een kus, verdriet, eenzaamheid, jaloezie
- Alcohol of drugs in het verhaal **zonder ze te verheerlijken** als
  levensstijl
- Een lichte vloek in dialoog (*"verdomme"*, *"shit"*) als het bij het
  personage past

**Niet toegestaan**:

- Expliciete seksuele scènes
- Grafisch bloed of marteling (een gevecht of een lijk mag, sober beschreven)
- Scheldwoorden gericht op groepen (racistisch / homofoob / seksistisch)
- Keiharde F-bombs als stopwoord in elke zin
- Drugs of alcohol als coole levensstijl

De insteek is: **niet preuts, niet braaf, ook niet plat**. LMCs: geef aan of
deze bandbreedte goed zit voor jullie scholen en doelgroep, of we strenger
of juist losser moeten zijn op specifieke punten.

### Wisselen tussen modi vanuit gesprek

Als een leerling in coach-modus zegt *"laat de AI het toch maar schrijven"*
(of in schrijver-modus *"ik wil het zelf gaan doen"*), herkent de AI dat en
plaatst aan het eind een onzichtbare tag waardoor de UI een knop **↻ Wissel
naar AI / zelf schrijven** toont. De leerling klikt en zit in de andere
modus, met behoud van bestaande tekst.

## De twee schrijfmodi technisch

`/api/coach` is dezelfde streaming-endpoint voor beide modi. Het verschil zit
in een `modus` parameter in de request body en daaraan gekoppelde prompt:

| Modus       | Prompt-bestand        | Gedrag                                                                                                                |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `coach`     | `fase1.md` of `fase2.md` | Coacht. Geeft tips, weigert hele zinnen voor te schrijven. Plaatst tag `[[bouwsteen: …]]` voor de "gebruik voor bouwsteen"-knop. |
| `schrijver` | `fase2-ai.md`         | Schrijft mee. Bij elke vraag levert hij een korte uitleg + complete nieuwe verhaalversie achter de marker `===VERHAAL===`. Bij conflict tussen bouwsteen en verhaal is de bouwsteen leidend. |

De frontend bepaalt de modus aan de hand van `verhaalKeuze`-state. Beide modi
sturen bij elke call de **actuele bouwstenen** mee, dus aanpassingen achteraf
worden direct verwerkt.

## Speciale tags die de coach kan plaatsen

De coach laat aan het eind van een antwoord (op een eigen regel) machine-
leesbare tags achter die de UI gebruikt voor knoppen. Deze tags worden uit de
zichtbare tekst gestript voordat het bericht aan de leerling wordt getoond.

| Tag                       | Plaatst                                                                          | Effect in UI                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `[[bouwsteen: 1-6\|geen]]` | Coach in fase 1 / fase 2 (zelf-modus)                                            | Bij relevante antwoorden: knop **↗ Gebruik voor een bouwsteen** die `/api/samenvat` aanroept. |
| `[[wissel: zelf\|ai]]`     | Coach (beide modi) als de leerling expliciet om een modus-wissel vraagt          | Knop **↻ Wissel naar zelf/AI** onder dat bericht; klik wijzigt `verhaalKeuze`.       |
| `===VERHAAL===`            | Schrijver-modus, gevolgd door de complete nieuwe verhaaltekst                    | Inline knop **↗ Plaats deze versie in mijn verhaal** onder dat bericht.              |

## Model-keuze (door LMC of leerling)

- **Alleen providers met een API key** verschijnen in de selector.
- **LMC beperkt** de lijst optioneel via `LMC_TOEGESTANE_MODELLEN`.
- **Leerling kiest** in de topbalk ("AI: …"). Keuze blijft bewaard in
  localStorage.
- Bij capaciteit-issues (`429 service_tier_capacity_exceeded` van Mistral
  bv.) krijgt de leerling een specifieke melding met advies om rechtsboven
  een ander model te kiezen.

## Auto-save en backup

- Hele state (bouwstenen, verhaaltekst, berichten, badges) wordt na elke
  wijziging in localStorage gezet onder key `verhaalmaker.bib.v1`.
- Bij localStorage-fouten (quota, private mode) verschijnt een rode banner
  met handmatige `.txt`-download-knop. Er worden **geen** automatische
  downloads meer gedaan.

## Rate-limiting

Met `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` geactiveerd:

- 1000 requests / uur per IP
- 200 requests / 8 uur per browser-sessie (cookie `vm_sess`)
- Bij overschrijding: 429 met expliciete melding hoe lang ze moeten wachten.

Zonder Upstash: rate-limiting uit (handig voor lokaal werken).

## Deploy naar Vercel

1. Push naar GitHub (`Bibliotheek-van-de-Toekomst/Verhalenmaker`). Push
   alleen vanaf het `biebvandetoekomst` GitHub-account, niet vanaf andere
   accounts (zie `CLAUDE.md`).
2. Vercel detecteert automatisch Next.js en deployt op `main`.
3. Zet de env-vars onder **Settings → Environment Variables** (alle 3 de
   API-keys + optioneel Upstash).

Runtime staat op `nodejs` (niet `edge`) zodat prompts via `fs` gelezen kunnen
worden en de Mistral-SDK stabiel werkt.

## Prompts aanpassen zonder deploy

De prompts zijn Markdown in `prompts/`:

- `fase1.md` — coach voor bouwstenen
- `fase2.md` — coach in zelf-schrijven-modus (gouden regel: schrijft niet voor)
- `fase2-ai.md` — schrijver-modus
- `genereer.md` — eerste verhaal-versie genereren

Alleen `{{tone}}` wordt vervangen; alle andere context (bouwstenen, verhaal,
selectie, vraag) voegen de routes toe aan de user-message.

## Projectstructuur

```
app/
  api/
    coach/route.ts        Streaming coach (modus = coach | schrijver)
    genereer/route.ts     Streaming first-draft generator
    samenvat/route.ts     Distilleer een bouwsteen-zin uit het gesprek
    models/route.ts       Lijst beschikbare modellen
  layout.tsx, page.tsx
components/
  VerhaalMaker.tsx        Hoofd-UI
  BibOnboarding.tsx       Welkom-modal (alleen voornaam)
  BibKlaarScherm.tsx      Klaar-scherm met titel-input + Boekbot-prompt
  ModelSelector.tsx       Dropdown met AI-modellen
  Bib{Logo,Icon,...}.tsx  Huisstijl-bouwstenen
lib/
  tokens.ts               BIB-kleuren en fonts
  stappen.ts              Zes bouwstenen
  providers.ts            Multi-LLM registry
  ratelimit.ts            Upstash rate-limit logica
  invoer.ts               Sanitatie + max-lengths + CORS-whitelist
prompts/
  fase1.md, fase2.md, fase2-ai.md, genereer.md
```

## Wat er NOG NIET in zit (bewust, voor MVP)

- **Access gate + dag-codes** — vereist een aparte gateway.
- **LMC-paneel** — selector in de topbalk laat de leerling kiezen; LMC
  beperkt de lijst via env-var.
- **Echte The-Mix-fonts** — fallback naar Georgia/Arial. Vervang vóór
  productie als de fontfile beschikbaar is.
