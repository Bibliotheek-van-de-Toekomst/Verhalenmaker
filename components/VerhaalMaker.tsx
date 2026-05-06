"use client";

import React from "react";
import { BIB } from "@/lib/tokens";
import { BIB_STAPPEN, BOUWSTEEN_ICON, WAAROM } from "@/lib/stappen";
import { BibLogo } from "./BibLogo";
import { PijlerRij } from "./PijlerRij";
import { BibIcon, type IconName } from "./BibIcon";
import { KrullUnder } from "./KrullUnder";
import { BibFaseStap } from "./BibFaseStap";
import { BibAutoSaveDot } from "./BibAutoSaveDot";
import { BibOnboarding } from "./BibOnboarding";
import { BibKlaarScherm } from "./BibKlaarScherm";
import { ModelSelector, type BeschikbaarModel } from "./ModelSelector";
import { BibMedaille } from "./BibMedaille";
import { BADGES, berekenBadgeIds, type BadgeId } from "@/lib/badges";
import { useMediaQuery } from "@/lib/useMediaQuery";

const LS_KEY_BIB = "verhaalmaker.bib.v1";
const LS_KEY_MODEL = "verhaalmaker.model.v1";

type Bericht = {
  van: "bot" | "ik";
  tekst: string;
  fase?: 1 | 2;
  isError?: boolean;
  modelId?: string;
};

type Leerling = { naam: string; klas: string };

type SavedState = Partial<{
  fase: 1 | 2;
  stap: number;
  bouwstenen: Record<string, string>;
  verhaalTitel: string;
  verhaalTekst: string;
  leerling: Leerling;
  berichten: Bericht[];
  verdiendeBadges: string[];
}>;

function loadLS(): SavedState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_BIB) || "{}");
  } catch {
    return {};
  }
}
function saveLS(data: SavedState) {
  try {
    localStorage.setItem(LS_KEY_BIB, JSON.stringify(data));
  } catch {}
}

const BOUWSTEEN_TAG_REGEX = /\[+\s*bouwsteen\s*:\s*(\d+|geen)\s*\]+/gi;

function parseBouwsteenTag(tekst: string): {
  tekst: string;
  bouwsteen: number | "geen" | null;
} {
  const matches = [...tekst.matchAll(BOUWSTEEN_TAG_REGEX)];
  if (matches.length === 0) {
    return { tekst, bouwsteen: null };
  }
  const laatste = matches[matches.length - 1][1].toLowerCase();
  let bouwsteen: number | "geen" | null = null;
  if (laatste === "geen") bouwsteen = "geen";
  else {
    const n = parseInt(laatste, 10);
    if (n >= 1 && n <= 6) bouwsteen = n;
  }
  const schoon = tekst.replace(BOUWSTEEN_TAG_REGEX, "").trimEnd();
  return { tekst: schoon, bouwsteen };
}

const WISSEL_TAG_REGEX = /\[+\s*wissel\s*:\s*(zelf|ai)\s*\]+/gi;

function parseWisselTag(tekst: string): {
  tekst: string;
  wissel: "zelf" | "ai" | null;
} {
  const matches = [...tekst.matchAll(WISSEL_TAG_REGEX)];
  if (matches.length === 0) return { tekst, wissel: null };
  const laatste = matches[matches.length - 1][1].toLowerCase();
  const wissel =
    laatste === "zelf" || laatste === "ai" ? (laatste as "zelf" | "ai") : null;
  const schoon = tekst.replace(WISSEL_TAG_REGEX, "").trimEnd();
  return { tekst: schoon, wissel };
}

const VERHAAL_MARKER_REGEX = /^[ \t]*={3,}\s*VERHAAL\s*={3,}[ \t]*$/im;

function parseVerhaalBlok(tekst: string): {
  uitleg: string;
  verhaal: string | null;
} {
  const m = tekst.match(VERHAAL_MARKER_REGEX);
  if (!m || m.index === undefined) {
    return { uitleg: tekst, verhaal: null };
  }
  const uitleg = tekst.slice(0, m.index).trimEnd();
  const verhaal = tekst.slice(m.index + m[0].length).trim();
  return { uitleg, verhaal: verhaal.length > 0 ? verhaal : null };
}

function scoreVan(t: string): "vaag" | "goed" | "levendig" | null {
  if (!t || t.length < 10) return null;
  const cijfer = /\d/.test(t),
    komma = /,/.test(t),
    w = t.split(/\s+/).length;
  if (t.length > 60 && cijfer && komma && w > 10) return "levendig";
  if (t.length > 30 && (komma || cijfer)) return "goed";
  return "vaag";
}

const scoreInfo = {
  vaag: {
    label: "te vaag",
    kleur: BIB.vaag,
    tip: "Voeg een detail toe: een naam, een leeftijd, of iets wat je ziet of hoort.",
  },
  goed: {
    label: "goed",
    kleur: BIB.antraciet,
    tip: "Goed! Nog één zintuig erbij maakt het filmisch.",
  },
  levendig: {
    label: "levendig",
    kleur: BIB.levendig,
    tip: "Dit kun je mooi in je verhaal gebruiken.",
  },
} as const;

type Props = {
  subnaam?: string;
  stepCount?: number;
  tone?: string;
};

export function VerhaalMaker({
  subnaam = "Meppel",
  stepCount = 6,
  tone = "rustig, duidelijk, positief",
}: Props) {
  const [hydrated, setHydrated] = React.useState(false);
  const [fase, setFase] = React.useState<1 | 2>(1);
  const [stap, setStap] = React.useState(0);
  const [input, setInput] = React.useState("");
  const [bezig, setBezig] = React.useState(false);
  const [tipOpen, setTipOpen] = React.useState<number | null>(null);
  const [badgesOpen, setBadgesOpen] = React.useState(false);
  const [bekekenBouwsteen, setBekekenBouwsteen] = React.useState<number | null>(null);
  const [samenvatPopup, setSamenvatPopup] = React.useState<
    | null
    | {
        bouwsteenNr: number;
        tekst: string;
        laden: boolean;
        fout?: string;
      }
  >(null);
  const [verdiendeBadges, setVerdiendeBadges] = React.useState<Set<BadgeId>>(
    () => new Set(),
  );
  const [nieuweBadge, setNieuweBadge] = React.useState<BadgeId | null>(null);
  const [opslaanFout, setOpslaanFout] = React.useState<string | null>(null);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [mobielTab, setMobielTab] = React.useState<"coach" | "werkvlak">(
    "werkvlak",
  );

  const stappen = BIB_STAPPEN.slice(0, stepCount);

  const [bouwstenen, setBouwstenen] = React.useState<Record<string, string>>({
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
  });
  const [verhaalTitel, setVerhaalTitel] = React.useState("");
  const [verhaalTekst, setVerhaalTekst] = React.useState("");
  const [onboarding, setOnboarding] = React.useState(true);
  const [leerling, setLeerling] = React.useState<Leerling>({ naam: "", klas: "" });
  const [klaar, setKlaar] = React.useState(false);
  const [laatsteVraag, setLaatsteVraag] = React.useState<
    { vraag: string; extraContext?: string } | null
  >(null);

  const [lastSave, setLastSave] = React.useState(Date.now());
  const [berichten, setBerichten] = React.useState<Bericht[]>([]);
  const berichtenScrollRef = React.useRef<HTMLDivElement>(null);

  const [modellen, setModellen] = React.useState<BeschikbaarModel[]>([]);
  const [modelId, setModelId] = React.useState<string | null>(null);
  const vorigGebruiktModel = React.useRef<string | null>(null);

  const [verhaalKeuze, setVerhaalKeuze] = React.useState<
    "zelf" | "ai" | null
  >(null);
  const [genereerBezig, setGenereerBezig] = React.useState(false);
  const [genereerFout, setGenereerFout] = React.useState<string | null>(null);

  React.useEffect(() => {
    const saved = loadLS();
    if (saved.fase) setFase(saved.fase);
    if (typeof saved.stap === "number") setStap(saved.stap);
    if (saved.bouwstenen) setBouwstenen((b) => ({ ...b, ...saved.bouwstenen }));
    if (saved.verhaalTitel) setVerhaalTitel(saved.verhaalTitel);
    if (saved.verhaalTekst) setVerhaalTekst(saved.verhaalTekst);
    if (saved.leerling?.naam) {
      setLeerling(saved.leerling);
      setOnboarding(false);
    }
    if (saved.berichten && saved.berichten.length) setBerichten(saved.berichten);
    if (saved.verdiendeBadges && Array.isArray(saved.verdiendeBadges)) {
      setVerdiendeBadges(new Set(saved.verdiendeBadges as BadgeId[]));
    }
    const gekozen = localStorage.getItem(LS_KEY_MODEL);
    if (gekozen) setModelId(gekozen);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModellen(data.modellen || []);
        setModelId((huidig) => {
          if (huidig && data.modellen.some((m: BeschikbaarModel) => m.id === huidig)) {
            return huidig;
          }
          return data.standaardModel ?? data.modellen?.[0]?.id ?? null;
        });
      })
      .catch(() => setModellen([]));
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        LS_KEY_BIB,
        JSON.stringify({
          fase,
          stap,
          bouwstenen,
          verhaalTitel,
          verhaalTekst,
          leerling,
          berichten: berichten.slice(-20),
          verdiendeBadges: Array.from(verdiendeBadges),
        }),
      );
      if (opslaanFout) setOpslaanFout(null);
    } catch (err) {
      setOpslaanFout(
        "Je verhaal kan nu niet lokaal worden opgeslagen. Download meteen een backup om niets te verliezen.",
      );
    }
    setLastSave(Date.now());
  }, [
    hydrated,
    fase,
    stap,
    bouwstenen,
    verhaalTitel,
    verhaalTekst,
    leerling,
    berichten,
    verdiendeBadges,
    opslaanFout,
  ]);

  React.useEffect(() => {
    if (!hydrated) return;
    const huidige = berekenBadgeIds(bouwstenen, verhaalTekst);
    const nieuwe = Array.from(huidige).filter((id) => !verdiendeBadges.has(id));
    if (nieuwe.length > 0) {
      setVerdiendeBadges(new Set(huidige));
      setNieuweBadge(nieuwe[0]);
      const t = setTimeout(() => setNieuweBadge(null), 2400);
      return () => clearTimeout(t);
    }
  }, [hydrated, bouwstenen, verhaalTekst, verdiendeBadges]);

  React.useEffect(() => {
    if (modelId) localStorage.setItem(LS_KEY_MODEL, modelId);
  }, [modelId]);

  const gevuldAantal = Object.values(bouwstenen).filter(
    (v) => v && v.trim().length >= 10,
  ).length;
  const klaarVoorSchrijven = gevuldAantal >= 4;
  const alleBouwstenenVol = gevuldAantal === stappen.length;

  React.useEffect(() => {
    if (fase !== 2) return;
    if (verhaalKeuze === null) return;
    if (berichten.some((b) => b.fase === 2)) return;
    const tekst =
      verhaalKeuze === "ai"
        ? "De AI heeft je verhaal geschreven. Vraag hieronder of ze iets moet aanpassen — bijvoorbeeld **maak het langer**, **voeg een spannende scène toe** of **verander het einde**.\n\nKlik bij elk antwoord op **Plaats deze versie in mijn verhaal** om over te nemen."
        : "Mooi, stap 2! Jij schrijft — ik lees mee.\n\nMarkeer een zin en klik op **Feedback op selectie** voor gerichte tips.";
    setBerichten((b) => [...b, { van: "bot", fase: 2, tekst }]);
  }, [fase, verhaalKeuze, berichten]);

  React.useEffect(() => {
    if (hydrated && !onboarding && berichten.length === 0 && leerling.naam) {
      setBerichten([
        {
          van: "bot",
          tekst: `Hoi ${leerling.naam}! Leuk dat je meedoet.\n\nWe werken in twee stappen:\n**Stap 1** — bouwstenen verzamelen (rechts)\n**Stap 2** — jij schrijft, ik help je aanscherpen\n\nMet welke bouwsteen wil je beginnen?`,
        },
      ]);
    }
  }, [hydrated, onboarding, berichten.length, leerling.naam]);

  React.useEffect(() => {
    const last = berichten[berichten.length - 1];
    if (last?.van !== "ik") return;
    const container = berichtenScrollRef.current;
    if (!container) return;
    const msgs = container.querySelectorAll(".bib-msg");
    const lastMsg = msgs[msgs.length - 1] as HTMLElement | undefined;
    lastMsg?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [berichten.length]);

  const verstuur = async (extraContext?: string, retryVraag?: string) => {
    const vraag = retryVraag || input;
    if (!vraag.trim() || bezig) return;
    if (isMobile && mobielTab !== "coach") {
      setMobielTab("coach");
    }
    if (!retryVraag) {
      setBerichten((b) => [
        ...b,
        {
          van: "ik",
          tekst: vraag + (extraContext ? `\n\n[geselecteerd: "${extraContext}"]` : ""),
        },
      ]);
      setInput("");
    }
    setLaatsteVraag({ vraag, extraContext });
    setBezig(true);
    try {
      const modelGewisseld =
        vorigGebruiktModel.current !== null &&
        modelId !== null &&
        vorigGebruiktModel.current !== modelId;
      const modus =
        fase === 2 && verhaalKeuze === "ai" ? "schrijver" : "coach";
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fase,
          tone,
          bouwstenen,
          vraag,
          verhaalTekst: fase === 2 ? verhaalTekst : undefined,
          selectie: extraContext,
          modelId,
          modelGewisseld,
          actieveBouwsteen: fase === 1 ? stap + 1 : undefined,
          modus,
        }),
      });
      if (res.status === 429) {
        const rlTekst = await res.text().catch(
          () => "Je hebt even te veel verzoeken gedaan. Probeer het zo opnieuw.",
        );
        setBerichten((b) => [
          ...b,
          {
            van: "bot",
            isError: true,
            tekst:
              rlTekst ||
              "Je hebt even te veel verzoeken gedaan. Probeer het zo opnieuw.",
          },
        ]);
        setBezig(false);
        return;
      }
      if (!res.ok) {
        const errTekst = await res
          .text()
          .catch(() => "");
        setBerichten((b) => [
          ...b,
          {
            van: "bot",
            isError: true,
            tekst:
              errTekst ||
              "De coach is even niet bereikbaar. Klik op **Opnieuw proberen** of stel je vraag anders.",
          },
        ]);
        setBezig(false);
        return;
      }
      if (!res.body) throw new Error("coach faalt");

      const modelGebruikt = res.headers.get("X-Model") ?? modelId ?? undefined;
      if (modelGebruikt) vorigGebruiktModel.current = modelGebruikt;
      const botIndex = await new Promise<number>((resolve) => {
        setBerichten((b) => {
          const next = [
            ...b,
            { van: "bot" as const, tekst: "", modelId: modelGebruikt },
          ];
          resolve(next.length - 1);
          return next;
        });
      });

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setBerichten((b) => {
          const copy = [...b];
          copy[botIndex] = { van: "bot", tekst: acc, modelId: modelGebruikt };
          return copy;
        });
      }
      if (!acc.trim()) {
        setBerichten((b) => {
          const copy = [...b];
          copy[botIndex] = {
            van: "bot",
            isError: true,
            tekst: "Ik kreeg geen antwoord. Probeer het opnieuw.",
            modelId: modelGebruikt,
          };
          return copy;
        });
      }
    } catch {
      setBerichten((b) => [
        ...b,
        {
          van: "bot",
          isError: true,
          tekst:
            "De coach is even niet bereikbaar. Klik op **Opnieuw proberen** of stel je vraag anders.",
        },
      ]);
    }
    setBezig(false);
  };

  const genereerVerhaal = async () => {
    if (genereerBezig || !alleBouwstenenVol) return;
    setGenereerFout(null);
    setGenereerBezig(true);
    setVerhaalKeuze("ai");
    setVerhaalTekst("");
    if (isMobile) setMobielTab("werkvlak");
    try {
      const res = await fetch("/api/genereer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, bouwstenen, modelId }),
      });
      if (res.status === 429) {
        const tekst = await res
          .text()
          .catch(
            () => "Even te veel verzoeken. Probeer het over een paar minuten opnieuw.",
          );
        setGenereerFout(
          tekst ||
            "Even te veel verzoeken. Probeer het over een paar minuten opnieuw.",
        );
        return;
      }
      if (!res.ok || !res.body) {
        const tekst = await res.text().catch(() => "");
        throw new Error(tekst || "genereer faalt");
      }
      const modelGebruikt = res.headers.get("X-Model") ?? modelId ?? undefined;
      if (modelGebruikt) vorigGebruiktModel.current = modelGebruikt;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setVerhaalTekst(acc);
      }
      if (!acc.trim()) {
        setGenereerFout(
          "Het AI-model gaf geen tekst terug. Probeer het opnieuw of kies een ander model.",
        );
      }
    } catch (err) {
      const melding =
        err instanceof Error && err.message
          ? err.message
          : "Het is niet gelukt om een verhaal te maken. Probeer het zo opnieuw.";
      setGenereerFout(melding);
    } finally {
      setGenereerBezig(false);
    }
  };

  const [plaatsBevestigdIndex, setPlaatsBevestigdIndex] = React.useState<
    number | null
  >(null);

  const plaatsAiVersie = (index: number, verhaal: string) => {
    setVerhaalTekst(verhaal);
    setPlaatsBevestigdIndex(index);
    setTimeout(() => setPlaatsBevestigdIndex(null), 1800);
    if (isMobile) setMobielTab("werkvlak");
  };

  const [selectie, setSelectie] = React.useState("");
  React.useEffect(() => {
    const h = () => {
      const s = window.getSelection?.()?.toString().trim();
      if (s && s.length > 2) setSelectie(s);
    };
    document.addEventListener("selectionchange", h);
    return () => document.removeEventListener("selectionchange", h);
  }, []);

  const vraagOverSelectie = async (vraagTekst: string) => {
    if (!selectie || bezig) return;
    await verstuur(selectie, vraagTekst);
  };

  const openSamenvat = async () => {
    setSamenvatPopup({
      bouwsteenNr: stap + 1,
      tekst: "",
      laden: true,
    });
    try {
      const res = await fetch("/api/samenvat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berichten: berichten
            .slice(-10)
            .map((b) => ({ van: b.van, tekst: b.tekst })),
          bouwstenen,
          modelId,
          actieveBouwsteen: fase === 1 ? stap + 1 : undefined,
        }),
      });
      if (!res.ok) {
        let foutmelding =
          "De coach kon geen samenvatting maken. Probeer het zo opnieuw.";
        try {
          const data = await res.json();
          if (typeof data?.error === "string" && data.error.trim()) {
            foutmelding = data.error;
          }
        } catch {
          // negeer parse-fout, houd generieke melding
        }
        setSamenvatPopup({
          bouwsteenNr: stap + 1,
          tekst: "",
          laden: false,
          fout: foutmelding,
        });
        return;
      }
      const data = await res.json();
      setSamenvatPopup({
        bouwsteenNr: data.bouwsteenNr,
        tekst: data.tekst,
        laden: false,
      });
    } catch {
      setSamenvatPopup({
        bouwsteenNr: stap + 1,
        tekst: "",
        laden: false,
        fout: "De coach kon geen samenvatting maken. Probeer het zo opnieuw.",
      });
    }
  };

  const slaSamenvatOp = (mode: "nieuw" | "overschrijf" | "aanvul") => {
    if (!samenvatPopup || !samenvatPopup.tekst.trim()) return;
    const nr = samenvatPopup.bouwsteenNr;
    const huidig = (bouwstenen[String(nr)] || "").trim();
    let nieuwe = samenvatPopup.tekst.trim();
    if (mode === "aanvul" && huidig) {
      nieuwe = `${huidig} ${nieuwe}`.trim();
    }
    setBouwstenen({ ...bouwstenen, [String(nr)]: nieuwe });
    setStap(nr - 1);
    setSamenvatPopup(null);
    if (isMobile) setMobielTab("werkvlak");
  };

  const aantalBadges = verdiendeBadges.size;
  const heroTitel =
    aantalBadges === 0
      ? "Verdien je eerste medaille"
      : aantalBadges === BADGES.length
        ? "Alle medailles behaald! ✨"
        : `${aantalBadges} van de ${BADGES.length} medailles`;
  const heroUitleg =
    aantalBadges === 0
      ? "Vul je bouwstenen concreet in om medailles te verdienen. Elke medaille laat iets zien wat jij goed hebt gedaan."
      : aantalBadges === BADGES.length
        ? "Alles gelukt! Je hebt elk onderdeel van een sterk verhaal aangeraakt."
        : "Blijf je bouwstenen aanscherpen en schrijf door — er wachten nog medailles op je.";

  const woordenTelling = verhaalTekst.trim()
    ? verhaalTekst.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const auteurNaam = leerling.naam;

  const htmlEscape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const downloadBackup = React.useCallback(
    (reden?: string) => {
      if (typeof window === "undefined") return;
      try {
        const regels: string[] = [];
        regels.push("=== VERHAALMAKER BACKUP ===");
        regels.push(
          `Datum: ${new Date().toLocaleString("nl-NL", {
            dateStyle: "short",
            timeStyle: "short",
          })}`,
        );
        if (reden) regels.push(`Moment: ${reden}`);
        if (leerling.naam)
          regels.push(
            `Auteur: ${leerling.naam}${leerling.klas ? ` (${leerling.klas})` : ""}`,
          );
        if (verhaalTitel) regels.push(`Titel: ${verhaalTitel}`);
        regels.push("");
        regels.push("--- BOUWSTENEN ---");
        for (const s of stappen) {
          const v = (bouwstenen[String(s.n)] || "").trim();
          regels.push("");
          regels.push(`${s.n}. ${s.titel}`);
          regels.push(v || "(leeg)");
        }
        regels.push("");
        regels.push("--- VERHAAL ---");
        regels.push("");
        regels.push(verhaalTekst.trim() || "(nog geen verhaal geschreven)");
        const blob = new Blob([regels.join("\n")], {
          type: "text/plain;charset=utf-8",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const schoonNaam = (verhaalTitel || leerling.naam || "verhaal")
          .replace(/[^\w\- ]+/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 40) || "verhaal";
        const datumPlak = new Date()
          .toISOString()
          .slice(0, 16)
          .replace(/[:T]/g, "-");
        a.download = `verhaalmaker-${schoonNaam}-${datumPlak}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      } catch (err) {
        console.error("backup-download mislukt", err);
      }
    },
    [bouwstenen, leerling, stappen, verhaalTekst, verhaalTitel],
  );

  const exporteerWord = () => {
    const titelEsc = htmlEscape(verhaalTitel);
    const auteurEsc = htmlEscape(auteurNaam);
    const klasEsc = htmlEscape(leerling.klas);
    const paragrafen = verhaalTekst
      .split("\n\n")
      .map(
        (p) =>
          `<p>${htmlEscape(p).replace(/\n/g, "<br>")}</p>`,
      )
      .join("\n");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titelEsc}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; line-height: 1.7; color: ${BIB.antraciet};">
<h1 style="font-family: Georgia, serif;">${titelEsc}</h1>${auteurEsc ? `<p style="color:#6a6870;font-style:italic;">door ${auteurEsc}${klasEsc ? ` · ${klasEsc}` : ""}</p>` : ""}
${paragrafen}
</body></html>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${verhaalTitel || "verhaal"}.doc`;
    a.click();
  };

  const exporteerPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return alert("Sta pop-ups toe om te printen als PDF.");
    const titelEsc = htmlEscape(verhaalTitel);
    const auteurEsc = htmlEscape(auteurNaam);
    const klasEsc = htmlEscape(leerling.klas);
    const paragrafen = verhaalTekst
      .split("\n\n")
      .map(
        (p) =>
          `<p>${htmlEscape(p).replace(/\n/g, "<br>")}</p>`,
      )
      .join("\n");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titelEsc}</title>
<style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;line-height:1.7;color:${BIB.antraciet};padding:20px}h1{font-family:Georgia,serif;font-size:28px;margin-bottom:4px}.a{color:#6a6870;font-style:italic;margin-bottom:28px}p{margin:0 0 14px}@media print{body{margin:0}}</style></head>
<body><h1>${titelEsc}</h1>${auteurEsc ? `<div class="a">door ${auteurEsc}${klasEsc ? ` · ${klasEsc}` : ""}</div>` : ""}
${paragrafen}
<script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
    w.document.close();
  };

  const mailVerhaal = () => {
    const o = prompt("Naar welk mailadres?");
    if (!o) return;
    const body = `Hoi,\n\nHier is mijn verhaal "${verhaalTitel}"${auteurNaam ? ` van ${auteurNaam}` : ""}, gemaakt bij de workshop Verhaalmaker van de Bibliotheek.\n\n---\n\n${verhaalTekst}\n\n---\n\nGroeten!`;
    window.location.href = `mailto:${o}?subject=${encodeURIComponent(`Mijn verhaal: ${verhaalTitel}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BIB.wit,
        color: BIB.antraciet,
        fontFamily: BIB.tekst,
        fontSize: 14,
        lineHeight: 1.5,
        display: "grid",
        gridTemplateRows: opslaanFout
          ? isMobile
            ? "auto auto auto auto 1fr"
            : "auto auto auto 1fr"
          : isMobile
            ? "auto auto auto 1fr"
            : "auto auto 1fr",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes bibBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4 } 40% { transform: translateY(-4px); opacity: 1 } }
        @keyframes bibPulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        @keyframes bibFadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        .bib-msg { animation: bibFadeIn 0.24s ease both; scroll-margin-top: 20px; }
      `}</style>

      {onboarding && (
        <BibOnboarding
          leerling={leerling}
          onStart={(n, k) => {
            setLeerling({ naam: n, klas: k });
            setOnboarding(false);
          }}
        />
      )}

      {samenvatPopup && (() => {
        const nr = samenvatPopup.bouwsteenNr;
        const stapDef = stappen.find((s) => s.n === nr);
        const bestaand = (bouwstenen[String(nr)] || "").trim();
        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setSamenvatPopup(null)}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 70,
              background: "rgba(57,55,58,0.55)",
              backdropFilter: "blur(4px)",
              display: "grid",
              placeItems: "center",
              fontFamily: BIB.tekst,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: BIB.wit,
                borderRadius: 6,
                width: "min(520px, 100%)",
                padding: "24px 26px 22px",
                boxShadow: "0 24px 60px rgba(57,55,58,0.3)",
                position: "relative",
              }}
            >
              <button
                onClick={() => setSamenvatPopup(null)}
                aria-label="Sluiten"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  border: "none",
                  background: BIB.beige,
                  color: BIB.antraciet,
                  fontSize: 16,
                  cursor: "pointer",
                  fontFamily: BIB.tekst,
                  lineHeight: 1,
                }}
              >
                ×
              </button>

              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: BIB.antracietSoft,
                  marginBottom: 4,
                }}
              >
                Zet in bouwsteen
              </div>
              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 20,
                  fontWeight: 600,
                  color: BIB.antraciet,
                  letterSpacing: -0.2,
                  marginBottom: 14,
                }}
              >
                Samenvatting voor je werkblad
              </div>

              {samenvatPopup.laden ? (
                <div
                  style={{
                    padding: "24px 0",
                    textAlign: "center",
                    color: BIB.antracietSoft,
                    fontSize: 13,
                    fontStyle: "italic",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 5,
                      marginBottom: 8,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 99,
                          background: BIB.antraciet,
                          animation: `bibBounce 1.2s ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <div>Een samenvatting maken…</div>
                </div>
              ) : samenvatPopup.fout ? (
                <div
                  style={{
                    padding: "14px 16px",
                    background: "#fdebe5",
                    border: `1px solid ${BIB.vaag}60`,
                    borderRadius: 6,
                    color: BIB.antraciet,
                    fontSize: 13,
                    lineHeight: 1.5,
                    marginBottom: 14,
                  }}
                >
                  {samenvatPopup.fout}
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={openSamenvat}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 4,
                        border: `1px solid ${BIB.vaag}`,
                        background: BIB.wit,
                        color: BIB.vaag,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: BIB.tekst,
                      }}
                    >
                      ↻ Opnieuw proberen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <label
                    style={{
                      display: "block",
                      fontFamily: BIB.kop,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.4,
                      color: BIB.antraciet,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Welke bouwsteen?
                  </label>
                  <select
                    value={nr}
                    onChange={(e) =>
                      setSamenvatPopup({
                        ...samenvatPopup,
                        bouwsteenNr: Number(e.target.value),
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 4,
                      border: `1.5px solid ${BIB.line}`,
                      background: BIB.wit,
                      color: BIB.antraciet,
                      fontSize: isMobile ? 16 : 14,
                      fontFamily: BIB.tekst,
                      marginBottom: 14,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {stappen.map((s) => (
                      <option key={s.n} value={s.n}>
                        {s.n}. {s.titel}
                        {(bouwstenen[String(s.n)] || "").trim()
                          ? " (heeft al tekst)"
                          : ""}
                      </option>
                    ))}
                  </select>

                  {stapDef && (
                    <div
                      style={{
                        fontSize: 12,
                        color: BIB.antracietSoft,
                        fontStyle: "italic",
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      {stapDef.hint}
                    </div>
                  )}

                  <label
                    style={{
                      display: "block",
                      fontFamily: BIB.kop,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.4,
                      color: BIB.antraciet,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Wat komt er in?
                  </label>
                  <textarea
                    value={samenvatPopup.tekst}
                    onChange={(e) =>
                      setSamenvatPopup({
                        ...samenvatPopup,
                        tekst: e.target.value,
                      })
                    }
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 4,
                      border: `1.5px solid ${BIB.line}`,
                      background: BIB.wit,
                      color: BIB.antraciet,
                      fontSize: isMobile ? 16 : 14,
                      lineHeight: 1.55,
                      fontFamily: BIB.tekst,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                      marginBottom: bestaand ? 14 : 6,
                    }}
                  />

                  {bestaand && (
                    <div
                      style={{
                        padding: "10px 12px",
                        background: BIB.beigeSoft,
                        borderRadius: 4,
                        marginBottom: 14,
                        fontSize: 12,
                        color: BIB.antracietSoft,
                        lineHeight: 1.5,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 3,
                          color: BIB.antraciet,
                          textTransform: "uppercase",
                          fontSize: 10,
                          letterSpacing: 0.4,
                          fontFamily: BIB.kop,
                        }}
                      >
                        Deze bouwsteen heeft al tekst
                      </div>
                      &ldquo;{bestaand}&rdquo;
                    </div>
                  )}
                </>
              )}

              {!samenvatPopup.laden && !samenvatPopup.fout && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {bestaand ? (
                    <>
                      <button
                        onClick={() => slaSamenvatOp("overschrijf")}
                        disabled={!samenvatPopup.tekst.trim()}
                        style={{
                          flex: 1,
                          padding: "11px 14px",
                          borderRadius: 4,
                          border: "none",
                          background: samenvatPopup.tekst.trim()
                            ? BIB.antraciet
                            : BIB.beigeSoft,
                          color: samenvatPopup.tekst.trim()
                            ? BIB.wit
                            : BIB.antracietSoft,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: samenvatPopup.tekst.trim()
                            ? "pointer"
                            : "not-allowed",
                          fontFamily: BIB.tekst,
                          minWidth: 140,
                        }}
                      >
                        Overschrijven
                      </button>
                      <button
                        onClick={() => slaSamenvatOp("aanvul")}
                        disabled={!samenvatPopup.tekst.trim()}
                        style={{
                          flex: 1,
                          padding: "11px 14px",
                          borderRadius: 4,
                          border: `1.5px solid ${BIB.antraciet}`,
                          background: BIB.wit,
                          color: BIB.antraciet,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: samenvatPopup.tekst.trim()
                            ? "pointer"
                            : "not-allowed",
                          fontFamily: BIB.tekst,
                          minWidth: 140,
                          opacity: samenvatPopup.tekst.trim() ? 1 : 0.5,
                        }}
                      >
                        Aanvullen
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => slaSamenvatOp("nieuw")}
                      disabled={!samenvatPopup.tekst.trim()}
                      style={{
                        flex: 1,
                        padding: "11px 14px",
                        borderRadius: 4,
                        border: "none",
                        background: samenvatPopup.tekst.trim()
                          ? BIB.antraciet
                          : BIB.beigeSoft,
                        color: samenvatPopup.tekst.trim()
                          ? BIB.wit
                          : BIB.antracietSoft,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: samenvatPopup.tekst.trim()
                          ? "pointer"
                          : "not-allowed",
                        fontFamily: BIB.tekst,
                      }}
                    >
                      Opslaan in bouwsteen
                    </button>
                  )}
                  <button
                    onClick={() => setSamenvatPopup(null)}
                    style={{
                      padding: "11px 14px",
                      borderRadius: 4,
                      border: `1px solid ${BIB.line}`,
                      background: "transparent",
                      color: BIB.antracietSoft,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: BIB.tekst,
                    }}
                  >
                    Annuleren
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {bekekenBouwsteen !== null && (() => {
        const s = stappen.find((s) => s.n === bekekenBouwsteen);
        if (!s) return null;
        const content = bouwstenen[String(s.n)] || "";
        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setBekekenBouwsteen(null)}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 60,
              background: "rgba(57,55,58,0.55)",
              backdropFilter: "blur(4px)",
              display: "grid",
              placeItems: "center",
              fontFamily: BIB.tekst,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: BIB.wit,
                borderRadius: 6,
                width: "min(480px, 100%)",
                padding: "26px 28px 22px",
                boxShadow: "0 24px 60px rgba(57,55,58,0.3)",
                position: "relative",
              }}
            >
              <button
                onClick={() => setBekekenBouwsteen(null)}
                aria-label="Sluiten"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  border: "none",
                  background: BIB.beige,
                  color: BIB.antraciet,
                  fontSize: 16,
                  cursor: "pointer",
                  fontFamily: BIB.tekst,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: BIB.antracietSoft,
                  marginBottom: 4,
                }}
              >
                Bouwsteen {s.n}
              </div>
              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 22,
                  fontWeight: 600,
                  color: BIB.antraciet,
                  letterSpacing: -0.2,
                  marginBottom: 10,
                }}
              >
                {s.titel}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: BIB.antracietSoft,
                  marginBottom: 14,
                  lineHeight: 1.55,
                  fontStyle: "italic",
                }}
              >
                {s.hint}
              </div>
              <div
                style={{
                  background: content ? BIB.beige : BIB.beigeSoft,
                  padding: "14px 16px",
                  borderRadius: 6,
                  fontSize: 14,
                  color: content ? BIB.antraciet : BIB.antracietSoft,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  minHeight: 60,
                  fontStyle: content ? "normal" : "italic",
                }}
              >
                {content || "Nog niet ingevuld."}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button
                  onClick={() => {
                    setStap(s.n - 1);
                    setFase(1);
                    setBekekenBouwsteen(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    borderRadius: 4,
                    border: `1.5px solid ${BIB.antraciet}`,
                    background: BIB.wit,
                    color: BIB.antraciet,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={BIB.antraciet}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {content ? "Aanpassen" : "Invullen"}
                </button>
                <button
                  onClick={() => setBekekenBouwsteen(null)}
                  style={{
                    padding: "11px 14px",
                    borderRadius: 4,
                    border: `1px solid ${BIB.line}`,
                    background: "transparent",
                    color: BIB.antracietSoft,
                    fontSize: 13.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                  }}
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {klaar && (
        <BibKlaarScherm
          titel={verhaalTitel}
          onTitelChange={setVerhaalTitel}
          tekst={verhaalTekst}
          auteur={auteurNaam}
          klas={leerling.klas}
          bouwstenen={bouwstenen}
          verdiendeBadges={berekenBadgeIds(bouwstenen, verhaalTekst)}
          onDicht={() => setKlaar(false)}
          onWord={exporteerWord}
          onPdf={exporteerPdf}
          onMail={mailVerhaal}
          onReset={() => {
            const wilBackup = confirm(
              "Je gaat een nieuw verhaal beginnen — je huidige verhaal wordt ONHERROEPELIJK gewist.\n\nDruk OK om eerst een backup te downloaden (.txt-bestand).\nDruk Annuleren om zonder backup verder te gaan.",
            );
            if (wilBackup) {
              downloadBackup("voor-reset");
            } else {
              if (
                !confirm(
                  "Zonder backup verder? Je verhaal wordt definitief weggegooid.",
                )
              ) {
                return;
              }
            }
            if (
              !confirm("Nu echt je verhaal wissen en opnieuw beginnen?")
            ) {
              return;
            }
            localStorage.removeItem(LS_KEY_BIB);
            location.reload();
          }}
        />
      )}

      {opslaanFout && (
        <div
          role="alert"
          style={{
            background: "#fdebe5",
            borderBottom: `2px solid ${BIB.vaag}`,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: BIB.tekst,
            fontSize: 13,
            color: BIB.antraciet,
            lineHeight: 1.4,
          }}
        >
          <span aria-hidden style={{ color: BIB.vaag, fontWeight: 900 }}>⚠</span>
          <span style={{ flex: 1 }}>{opslaanFout}</span>
          <button
            onClick={() => downloadBackup("opslaan-fout")}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: `1px solid ${BIB.vaag}`,
              background: BIB.wit,
              color: BIB.vaag,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: BIB.tekst,
              whiteSpace: "nowrap",
            }}
          >
            ⤓ Download nu
          </button>
        </div>
      )}

      {/* TOP BAR */}
      <div
        style={{
          background: BIB.antraciet,
          padding: isMobile ? "8px 12px" : "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 24,
        }}
      >
        <div
          style={{
            background: BIB.wit,
            padding: isMobile ? "4px 8px" : "6px 12px",
            borderRadius: 2,
          }}
        >
          <BibLogo subnaam={subnaam} height={isMobile ? 28 : 44} />
        </div>
        {!isCompact && <PijlerRij actief={["Lees", "Doe"]} klein />}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 12,
          }}
        >
          {!isMobile && <BibAutoSaveDot lastSave={lastSave} />}
          <ModelSelector
            modellen={modellen}
            huidigId={modelId}
            onKies={(id) => setModelId(id)}
          />
        </div>
      </div>

      {/* TITEL + FASE-BAND */}
      <div
        style={{
          background: BIB.wit,
          borderBottom: `1px solid ${BIB.line}`,
          padding: isMobile ? "10px 12px" : "16px 24px 14px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 28,
          flexWrap: isMobile ? "wrap" : "nowrap",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 12,
          }}
        >
          <img
            src="/verhaalmaker.svg"
            alt=""
            style={{
              width: isMobile ? 28 : 40,
              height: isMobile ? 28 : 40,
              display: "block",
            }}
          />
          <div>
            <div
              style={{
                fontFamily: BIB.kop,
                fontSize: isMobile ? 18 : 26,
                fontWeight: 500,
                color: BIB.antraciet,
                letterSpacing: -0.2,
                lineHeight: 1,
              }}
            >
              Verhaalmaker
            </div>
            {!isMobile && (
              <>
                <KrullUnder width={132} />
                <div
                  style={{
                    fontSize: 11.5,
                    color: BIB.antracietSoft,
                    marginTop: 4,
                    fontFamily: BIB.tekst,
                  }}
                >
                  Workshop creatief schrijven
                </div>
              </>
            )}
          </div>
        </div>

        {!isMobile && (
          <div
            style={{
              width: 1,
              alignSelf: "stretch",
              background: BIB.line,
              margin: "0 4px",
            }}
          />
        )}

        <BibFaseStap
          nr={1}
          titel="Stap 1"
          subtitel={isMobile ? "" : "Bouwstenen verzamelen"}
          aktief={fase === 1}
          gedaan={fase > 1}
          onClick={() => setFase(1)}
        />
        <span style={{ color: BIB.antracietSoft, fontSize: 16 }}>›</span>
        <BibFaseStap
          nr={2}
          titel="Stap 2"
          subtitel={isMobile ? "" : "Jouw verhaal schrijven"}
          aktief={fase === 2}
          gedaan={false}
          onClick={() => setFase(2)}
        />

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 14,
          }}
        >
          {fase === 1 && (
            <>
              <div
                style={{
                  fontSize: isMobile ? 11.5 : 12,
                  color: BIB.antracietSoft,
                }}
              >
                <b
                  style={{
                    color: klaarVoorSchrijven ? BIB.levendig : BIB.antraciet,
                    fontFamily: BIB.tekst,
                  }}
                >
                  {gevuldAantal}
                </b>
                /{stappen.length}
                {!isMobile && " bouwstenen"}
              </div>
              <button
                onClick={() => klaarVoorSchrijven && setFase(2)}
                disabled={!klaarVoorSchrijven}
                title={
                  klaarVoorSchrijven
                    ? undefined
                    : "Vul minstens 4 bouwstenen in om door te gaan"
                }
                style={{
                  padding: isMobile ? "8px 12px" : "9px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: klaarVoorSchrijven ? BIB.antraciet : BIB.beigeSoft,
                  color: klaarVoorSchrijven ? BIB.wit : BIB.antracietSoft,
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 700,
                  fontFamily: BIB.tekst,
                  cursor: klaarVoorSchrijven ? "pointer" : "not-allowed",
                  letterSpacing: 0.2,
                }}
              >
                {isMobile
                  ? klaarVoorSchrijven
                    ? "Schrijven →"
                    : `Nog ${4 - gevuldAantal} bouwsteen${
                        4 - gevuldAantal === 1 ? "" : "en"
                      }`
                  : "Klaar om te schrijven →"}
              </button>
            </>
          )}
          {fase === 2 && (
            <button
              onClick={() => setKlaar(true)}
              style={{
                padding: isMobile ? "8px 12px" : "9px 16px",
                borderRadius: 4,
                border: "none",
                background: BIB.oranje,
                color: BIB.wit,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 700,
                fontFamily: BIB.tekst,
                cursor: "pointer",
                letterSpacing: 0.2,
              }}
            >
              {isMobile ? "Klaar →" : "Ik ben klaar →"}
            </button>
          )}
        </div>
      </div>

      {/* TAB SWITCHER (alleen mobiel) */}
      {isMobile && (
        <div
          role="tablist"
          style={{
            display: "flex",
            borderBottom: `1px solid ${BIB.line}`,
            background: BIB.wit,
            padding: "0 8px",
          }}
        >
          {(
            [
              { id: "werkvlak", label: fase === 1 ? "Werkblad" : "Verhaal" },
              { id: "coach", label: "Coach" },
            ] as const
          ).map((t) => {
            const actief = mobielTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={actief}
                onClick={() => setMobielTab(t.id)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  background: "transparent",
                  border: "none",
                  borderBottom: actief
                    ? `2px solid ${BIB.antraciet}`
                    : "2px solid transparent",
                  color: actief ? BIB.antraciet : BIB.antracietSoft,
                  fontSize: 13,
                  fontWeight: actief ? 700 : 500,
                  fontFamily: BIB.tekst,
                  cursor: "pointer",
                  letterSpacing: 0.2,
                  position: "relative",
                }}
              >
                {t.label}
                {t.id === "coach" && nieuweBadge && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: "calc(50% - 36px)",
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: BIB.oranje,
                      animation: "badgePulse 1s ease-in-out infinite",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* HOOFDZONE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(440px, 38fr) 62fr",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* LINKS — coach */}
        <div
          style={{
            background: BIB.koel,
            borderRight: isMobile ? "none" : `1px solid ${BIB.line}`,
            display: isMobile && mobielTab !== "coach" ? "none" : "flex",
            flexDirection: "column",
            minHeight: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${BIB.line}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 99,
                background: BIB.antraciet,
                display: "grid",
                placeItems: "center",
              }}
            >
              <BibIcon name="chat" size={15} stroke={1.8} color={BIB.wit} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 14,
                  fontWeight: 600,
                  color: BIB.antraciet,
                }}
              >
                Coach-gesprek
              </div>
              <div style={{ fontSize: 11, color: BIB.antracietSoft }}>
                {fase === 1
                  ? "Ik help je bouwstenen scherper maken"
                  : "Ik lees mee en geef aanscherp-tips — ik schrijf niet voor je"}
              </div>
            </div>
            <button
              onClick={() => setBadgesOpen(!badgesOpen)}
              style={{
                position: "relative",
                padding: "5px 10px 5px 6px",
                borderRadius: 99,
                border: `1px solid ${badgesOpen ? BIB.antraciet : BIB.bubbelRand}`,
                background: BIB.wit,
                color: BIB.antraciet,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: BIB.tekst,
                letterSpacing: 0.2,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 99,
                  background: BIB.antraciet,
                  color: BIB.wit,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  lineHeight: 1,
                }}
              >
                ✳
              </span>
              Jouw badges
              <span
                style={{
                  background: BIB.koel,
                  color: BIB.antraciet,
                  padding: "1px 7px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  border: `1px solid ${BIB.bubbelRand}`,
                }}
              >
                {aantalBadges}/{BADGES.length}
              </span>
              {nieuweBadge && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: BIB.oranje,
                    animation: "badgePulse 1s ease-in-out infinite",
                  }}
                />
              )}
            </button>
          </div>

          {badgesOpen && (
            <>
              <div
                onClick={() => setBadgesOpen(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 9,
                  background: "rgba(57,55,58,0.18)",
                  backdropFilter: "blur(2px)",
                  WebkitBackdropFilter: "blur(2px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 62,
                  left: 16,
                  right: 16,
                  zIndex: 10,
                  background: BIB.wit,
                  border: `1px solid ${BIB.bubbelRand}`,
                  borderRadius: 6,
                  boxShadow: "0 14px 40px rgba(57,55,58,0.28)",
                }}
              >
                <div
                  style={{
                    padding: "20px 20px 16px",
                    background: BIB.koel,
                    borderBottom: `1px solid ${BIB.bubbelRand}`,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 1.6,
                        textTransform: "uppercase",
                        color: BIB.antracietSoft,
                        fontWeight: 700,
                        fontFamily: BIB.kop,
                      }}
                    >
                      Jouw prestaties
                    </div>
                    <div
                      style={{
                        fontFamily: BIB.kop,
                        fontSize: 20,
                        fontWeight: 600,
                        color: BIB.antraciet,
                        marginTop: 4,
                        letterSpacing: -0.2,
                      }}
                    >
                      {heroTitel}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: BIB.antracietSoft,
                        marginTop: 6,
                        lineHeight: 1.5,
                        fontFamily: BIB.tekst,
                      }}
                    >
                      {heroUitleg}
                    </div>
                  </div>
                  <button
                    onClick={() => setBadgesOpen(false)}
                    aria-label="Sluiten"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      border: "none",
                      background: "transparent",
                      color: BIB.antracietSoft,
                      fontSize: 16,
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
                <div
                  style={{
                    padding: "22px 20px 24px",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "18px 12px",
                    justifyItems: "center",
                  }}
                >
                  {BADGES.map((def) => {
                    const behaald = verdiendeBadges.has(def.id);
                    return (
                      <div
                        key={def.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <BibMedaille
                          def={def}
                          behaald={behaald}
                          isNieuw={nieuweBadge === def.id}
                        />
                        <div
                          style={{
                            fontSize: 10.5,
                            textAlign: "center",
                            color: behaald ? BIB.antraciet : BIB.antracietSoft,
                            fontWeight: behaald ? 600 : 400,
                            fontFamily: BIB.tekst,
                            lineHeight: 1.3,
                            maxWidth: 82,
                          }}
                        >
                          {def.titel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* BERICHTEN */}
          <div
            ref={berichtenScrollRef}
            style={{
              flex: 1,
              overflow: "auto",
              padding: "18px 20px",
              background: BIB.koel,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {berichten.map((b, i) => {
                const isBotBericht = b.van === "bot" && !b.isError;
                const naBouwsteen = isBotBericht
                  ? parseBouwsteenTag(b.tekst)
                  : { tekst: b.tekst, bouwsteen: null as number | "geen" | null };
                const naWissel = isBotBericht
                  ? parseWisselTag(naBouwsteen.tekst)
                  : { tekst: naBouwsteen.tekst, wissel: null as "zelf" | "ai" | null };
                const verhaalGeparseerd = isBotBericht
                  ? parseVerhaalBlok(naWissel.tekst)
                  : { uitleg: naWissel.tekst, verhaal: null as string | null };
                const parsed = {
                  tekst: verhaalGeparseerd.uitleg,
                  bouwsteen: naBouwsteen.bouwsteen,
                };
                const heeftVerhaalBlok = verhaalGeparseerd.verhaal !== null;
                const wisselVoorstel: "zelf" | "ai" | null =
                  naWissel.wissel &&
                  ((naWissel.wissel === "ai" && verhaalKeuze !== "ai") ||
                    (naWissel.wissel === "zelf" && verhaalKeuze !== "zelf"))
                    ? naWissel.wissel
                    : null;
                const zichtbareTekst =
                  parsed.tekst.trim() ||
                  (heeftVerhaalBlok
                    ? "Hier is een nieuwe versie van je verhaal."
                    : parsed.tekst);
                const eerdereTagsZelfdeBouwsteen =
                  typeof parsed.bouwsteen === "number"
                    ? berichten.slice(0, i).filter((m) => {
                        if (m.van !== "bot" || m.isError) return false;
                        return (
                          parseBouwsteenTag(m.tekst).bouwsteen ===
                          parsed.bouwsteen
                        );
                      }).length
                    : 0;
                const toonSamenvatKnop =
                  isBotBericht &&
                  typeof parsed.bouwsteen === "number" &&
                  zichtbareTekst.trim().length > 20 &&
                  eerdereTagsZelfdeBouwsteen >= 1;
                return (
                <div
                  key={i}
                  className="bib-msg"
                  style={{
                    display: "flex",
                    gap: 9,
                    flexDirection: b.van === "ik" ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      flexShrink: 0,
                      background: b.van === "bot" ? BIB.antraciet : BIB.wit,
                      border:
                        b.van === "ik"
                          ? `1.5px solid ${BIB.antraciet}`
                          : "none",
                      color: b.van === "bot" ? BIB.wit : BIB.antraciet,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <BibIcon
                      name={b.van === "bot" ? "chat" : "user"}
                      size={13}
                      stroke={1.8}
                      color={b.van === "bot" ? BIB.wit : BIB.antraciet}
                    />
                  </div>
                  <div
                    style={{
                      maxWidth: "82%",
                      background:
                        b.van === "bot"
                          ? b.isError
                            ? "#fdebe5"
                            : BIB.wit
                          : BIB.antraciet,
                      color: b.van === "ik" ? BIB.wit : BIB.antraciet,
                      padding: "10px 13px",
                      borderRadius: 6,
                      border:
                        b.van === "ik"
                          ? "none"
                          : b.isError
                            ? `1px solid ${BIB.vaag}60`
                            : `1px solid ${BIB.bubbelRand}`,
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      fontFamily: BIB.tekst,
                    }}
                  >
                    {zichtbareTekst.split(/(\*\*[^*]+\*\*)/g).map((s, k) =>
                      s.startsWith("**") && s.endsWith("**") ? (
                        <strong key={k} style={{ fontWeight: 700 }}>
                          {s.slice(2, -2)}
                        </strong>
                      ) : (
                        <React.Fragment key={k}>{s}</React.Fragment>
                      ),
                    )}
                    {b.van === "bot" && b.modelId && !b.isError && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 10,
                          color: BIB.antracietSoft,
                          fontFamily: BIB.tekst,
                          letterSpacing: 0.2,
                          fontStyle: "italic",
                        }}
                      >
                        via{" "}
                        {modellen.find((m) => m.id === b.modelId)?.label ??
                          b.modelId}
                      </div>
                    )}
                    {heeftVerhaalBlok && verhaalGeparseerd.verhaal && (
                      <button
                        onClick={() =>
                          plaatsAiVersie(i, verhaalGeparseerd.verhaal!)
                        }
                        style={{
                          marginTop: 8,
                          padding: "5px 10px",
                          borderRadius: 4,
                          border: `1px solid ${BIB.antraciet}`,
                          background:
                            plaatsBevestigdIndex === i
                              ? BIB.levendig
                              : BIB.wit,
                          color:
                            plaatsBevestigdIndex === i
                              ? BIB.wit
                              : BIB.antraciet,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: BIB.tekst,
                          letterSpacing: 0.2,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "background 0.2s",
                        }}
                      >
                        {plaatsBevestigdIndex === i
                          ? "✓ Geplaatst"
                          : "↗ Plaats deze versie in mijn verhaal"}
                      </button>
                    )}
                    {wisselVoorstel && fase === 2 && (
                      <button
                        onClick={() => {
                          if (wisselVoorstel === "ai" && !alleBouwstenenVol) {
                            window.alert(
                              `De AI kan pas een verhaal schrijven als alle ${stappen.length} bouwstenen zijn ingevuld. Vul ze eerst aan in stap 1.`,
                            );
                            return;
                          }
                          if (
                            wisselVoorstel === "ai" &&
                            verhaalTekst.trim() &&
                            !window.confirm(
                              "Bij wisselen naar AI-modus kan de AI je huidige verhaal overschrijven met een nieuwe versie. Doorgaan?",
                            )
                          ) {
                            return;
                          }
                          setVerhaalKeuze(wisselVoorstel);
                        }}
                        style={{
                          marginTop: 8,
                          padding: "6px 12px",
                          borderRadius: 4,
                          border: `1px solid ${BIB.antraciet}`,
                          background: BIB.antraciet,
                          color: BIB.wit,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: BIB.tekst,
                          letterSpacing: 0.2,
                        }}
                      >
                        ↻ Wissel naar{" "}
                        {wisselVoorstel === "ai"
                          ? "AI laat schrijven"
                          : "zelf schrijven"}
                      </button>
                    )}
                    {toonSamenvatKnop && (
                      <button
                        onClick={openSamenvat}
                        disabled={samenvatPopup?.laden}
                        style={{
                          marginTop: 8,
                          padding: "5px 10px",
                          borderRadius: 4,
                          border: `1px solid ${BIB.antraciet}`,
                          background: BIB.wit,
                          color: BIB.antraciet,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: samenvatPopup?.laden
                            ? "progress"
                            : "pointer",
                          fontFamily: BIB.tekst,
                          letterSpacing: 0.2,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        ↗ Gebruik voor een bouwsteen
                      </button>
                    )}
                    {b.isError && laatsteVraag && (
                      <button
                        onClick={() => {
                          setBerichten((bs) => bs.filter((x) => !x.isError));
                          verstuur(laatsteVraag.extraContext, laatsteVraag.vraag);
                        }}
                        style={{
                          marginTop: 8,
                          padding: "5px 10px",
                          borderRadius: 4,
                          border: `1px solid ${BIB.vaag}`,
                          background: BIB.wit,
                          color: BIB.vaag,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: BIB.tekst,
                        }}
                      >
                        ↻ Opnieuw proberen
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
              {bezig && (
                <div style={{ display: "flex", gap: 9 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: BIB.antraciet,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <BibIcon name="chat" size={13} stroke={1.8} color={BIB.wit} />
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      background: BIB.wit,
                      border: `1px solid ${BIB.bubbelRand}`,
                      borderRadius: 6,
                      display: "flex",
                      gap: 5,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background: BIB.antraciet,
                          animation: `bibBounce 1.2s ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INPUT */}
          <div
            style={{
              padding: "10px 20px 14px",
              borderTop: `1px solid ${BIB.line}`,
              background: BIB.koel,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                background: BIB.wit,
                border: `1.5px solid ${BIB.line}`,
                borderRadius: 6,
                padding: "8px 8px 8px 14px",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    verstuur();
                  }
                }}
                placeholder={
                  fase === 1
                    ? "Vraag feedback op je bouwstenen…"
                    : verhaalKeuze === "ai"
                      ? "Vraag de AI om iets aan te passen…"
                      : "Vraag feedback op jouw verhaal…"
                }
                rows={1}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: BIB.antraciet,
                  fontSize: isMobile ? 16 : 13.5,
                  fontFamily: BIB.tekst,
                  resize: "none",
                  padding: "5px 0",
                  lineHeight: 1.5,
                  maxHeight: 90,
                }}
              />
              <button
                onClick={() => verstuur()}
                disabled={!input.trim() || bezig}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  border: "none",
                  background: input.trim() ? BIB.antraciet : BIB.beigeSoft,
                  color: input.trim() ? BIB.wit : BIB.antracietSoft,
                  cursor: input.trim() ? "pointer" : "default",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <BibIcon
                  name="send"
                  size={14}
                  stroke={2}
                  color={input.trim() ? BIB.wit : BIB.antracietSoft}
                />
              </button>
            </div>
          </div>
        </div>

        {/* RECHTS */}
        <div
          style={{
            background: BIB.beige,
            display: isMobile && mobielTab !== "werkvlak" ? "none" : "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {fase === 1 ? (
            <>
              <div style={{ padding: "18px 24px 8px" }}>
                <div
                  style={{
                    fontFamily: BIB.kop,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    color: BIB.antracietSoft,
                  }}
                >
                  Werkblad · Stap 1
                </div>
                <div
                  style={{
                    fontFamily: BIB.kop,
                    fontSize: 20,
                    fontWeight: 600,
                    color: BIB.antraciet,
                    marginTop: 4,
                    letterSpacing: -0.2,
                  }}
                >
                  Bouwstenen voor je verhaal
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: BIB.antracietSoft,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  Vul elke bouwsteen in. Klik op het vraagteken voor waarom dit belangrijk is.
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "8px 20px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {stappen.map((s, i) => {
                  const aktief = i === stap;
                  const score = scoreVan(bouwstenen[String(s.n)] || "");
                  const info = score ? scoreInfo[score] : null;
                  const iconNaam = (BOUWSTEEN_ICON[s.n] || "book") as IconName;
                  return (
                    <div
                      key={i}
                      onClick={() => setStap(i)}
                      style={{
                        background: BIB.wit,
                        border: aktief
                          ? `2px solid ${BIB.antraciet}`
                          : `1px solid ${BIB.line}`,
                        borderRadius: 6,
                        padding: aktief ? "12px 14px" : "10px 13px",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom:
                            bouwstenen[String(s.n)] || aktief ? 8 : 0,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 99,
                            background: score
                              ? score === "levendig"
                                ? BIB.levendig
                                : score === "goed"
                                  ? BIB.antraciet
                                  : BIB.vaag
                              : BIB.beige,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {score === "levendig" || score === "goed" ? (
                            <BibIcon
                              name="check"
                              size={13}
                              stroke={2.5}
                              color={BIB.wit}
                            />
                          ) : (
                            <BibIcon
                              name={iconNaam}
                              size={14}
                              stroke={1.8}
                              color={score === "vaag" ? BIB.wit : BIB.antraciet}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: BIB.kop,
                            fontSize: 14,
                            fontWeight: 600,
                            color: BIB.antraciet,
                            flex: 1,
                          }}
                        >
                          {s.n}. {s.titel}
                        </div>
                        {info && (
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.6,
                              padding: "3px 8px",
                              borderRadius: 99,
                              fontFamily: BIB.tekst,
                              background: BIB.wit,
                              color: info.kleur,
                              border: `1px solid ${info.kleur}`,
                            }}
                          >
                            {info.label}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTipOpen(tipOpen === s.n ? null : s.n);
                          }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 99,
                            border: `1px solid ${BIB.line}`,
                            background: BIB.wit,
                            color: BIB.antracietSoft,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                            fontFamily: BIB.tekst,
                          }}
                        >
                          ?
                        </button>
                      </div>
                      {tipOpen === s.n && (
                        <div
                          style={{
                            padding: "9px 12px",
                            background: BIB.beige,
                            borderRadius: 4,
                            fontSize: 12,
                            color: BIB.antraciet,
                            lineHeight: 1.5,
                            marginBottom: 8,
                          }}
                        >
                          <b>Waarom?</b> {WAAROM[s.n]}
                        </div>
                      )}
                      {aktief && (
                        <>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: BIB.antracietSoft,
                              marginBottom: 6,
                              lineHeight: 1.5,
                            }}
                          >
                            {s.hint}
                          </div>
                          <textarea
                            value={bouwstenen[String(s.n)] || ""}
                            onChange={(e) =>
                              setBouwstenen({
                                ...bouwstenen,
                                [String(s.n)]: e.target.value,
                              })
                            }
                            placeholder={s.voorbeeld}
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: "100%",
                              background: BIB.wit,
                              border: `1px solid ${BIB.line}`,
                              borderRadius: 4,
                              padding: "8px 10px",
                              fontSize: isMobile ? 16 : 13,
                              fontFamily: BIB.tekst,
                              color: BIB.antraciet,
                              outline: "none",
                              resize: "vertical",
                              lineHeight: 1.55,
                              boxSizing: "border-box",
                            }}
                          />
                          {info && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: info.kleur,
                                marginTop: 5,
                                fontStyle: "italic",
                              }}
                            >
                              {info.tip}
                            </div>
                          )}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              marginTop: 10,
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (i < stappen.length - 1) setStap(i + 1);
                                else if (klaarVoorSchrijven) setFase(2);
                              }}
                              disabled={
                                i === stappen.length - 1 && !klaarVoorSchrijven
                              }
                              style={{
                                padding: "8px 14px",
                                borderRadius: 4,
                                border: "none",
                                background:
                                  i === stappen.length - 1 && !klaarVoorSchrijven
                                    ? BIB.beigeSoft
                                    : BIB.antraciet,
                                color:
                                  i === stappen.length - 1 && !klaarVoorSchrijven
                                    ? BIB.antracietSoft
                                    : BIB.wit,
                                fontSize: 12.5,
                                fontWeight: 700,
                                fontFamily: BIB.tekst,
                                cursor:
                                  i === stappen.length - 1 && !klaarVoorSchrijven
                                    ? "not-allowed"
                                    : "pointer",
                                letterSpacing: 0.2,
                              }}
                            >
                              {i < stappen.length - 1
                                ? "Klaar, volgende →"
                                : "Klaar om te schrijven →"}
                            </button>
                          </div>
                        </>
                      )}
                      {!aktief && bouwstenen[String(s.n)] && (
                        <div
                          style={{
                            fontSize: 12,
                            color: BIB.antracietSoft,
                            lineHeight: 1.45,
                            paddingLeft: 38,
                          }}
                        >
                          {bouwstenen[String(s.n)].slice(0, 70)}
                          {bouwstenen[String(s.n)].length > 70 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: "12px 20px 10px",
                  borderBottom: `1px solid ${BIB.line}`,
                  background: BIB.wit,
                }}
              >
                <div
                  style={{
                    fontFamily: BIB.kop,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: BIB.antracietSoft,
                    marginBottom: 6,
                  }}
                >
                  Jouw bouwstenen
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {stappen.map((s, i) => {
                    const gevuld = !!bouwstenen[String(s.n)];
                    return (
                      <button
                        key={i}
                        onClick={() => setBekekenBouwsteen(s.n)}
                        title={gevuld ? "Klik om te bekijken of aan te passen" : "Nog niet ingevuld — klik om in te vullen"}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: gevuld ? BIB.wit : "transparent",
                          border: `1px solid ${gevuld ? BIB.antraciet : BIB.line}`,
                          color: gevuld ? BIB.antraciet : BIB.antracietSoft,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: BIB.tekst,
                        }}
                      >
                        {s.titel}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFase(1)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 99,
                      border: `1px dashed ${BIB.line}`,
                      background: "transparent",
                      color: BIB.antracietSoft,
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: BIB.tekst,
                    }}
                  >
                    ← terug naar werkblad
                  </button>
                  {verhaalKeuze !== null && (
                    <button
                      onClick={() => {
                        if (
                          verhaalTekst.trim() &&
                          !window.confirm(
                            verhaalKeuze === "ai"
                              ? "Je verhaal blijft staan. Wil je terug naar de keuze tussen zelf schrijven of AI?"
                              : "Je verhaal blijft staan. Als je voor AI kiest, wordt het overschreven met een nieuwe versie. Doorgaan?",
                          )
                        ) {
                          return;
                        }
                        setVerhaalKeuze(null);
                      }}
                      title="Wissel tussen zelf schrijven en door AI laten schrijven"
                      style={{
                        padding: "3px 10px",
                        borderRadius: 99,
                        border: `1px solid ${BIB.antraciet}`,
                        background: BIB.wit,
                        color: BIB.antraciet,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: BIB.tekst,
                      }}
                    >
                      ↻ Wissel modus ({verhaalKeuze === "ai" ? "AI" : "zelf"})
                    </button>
                  )}
                </div>
              </div>

              <div style={{ padding: "14px 20px 4px" }}>
                <div
                  style={{
                    fontFamily: BIB.kop,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    color: BIB.antracietSoft,
                  }}
                >
                  Verhaal · Stap 2
                </div>
                <input
                  value={verhaalTitel}
                  onChange={(e) => setVerhaalTitel(e.target.value)}
                  placeholder="Titel van je verhaal…"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: BIB.antraciet,
                    fontSize: 24,
                    fontWeight: 600,
                    fontFamily: BIB.kop,
                    padding: "4px 0",
                    letterSpacing: -0.3,
                    marginTop: 4,
                  }}
                />
                {leerling.naam && (
                  <div
                    style={{
                      width: "100%",
                      color: BIB.antracietSoft,
                      fontSize: isMobile ? 14 : 12.5,
                      fontStyle: "italic",
                      fontFamily: BIB.tekst,
                      padding: "2px 0",
                    }}
                  >
                    door {leerling.naam}
                  </div>
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "6px 20px 10px",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {genereerFout && (
                  <div
                    role="alert"
                    style={{
                      padding: "10px 14px",
                      background: "#fdebe5",
                      border: `1px solid ${BIB.vaag}60`,
                      borderRadius: 6,
                      color: BIB.antraciet,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ flex: 1 }}>{genereerFout}</span>
                    <button
                      onClick={() => setGenereerFout(null)}
                      aria-label="Sluiten"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: BIB.antracietSoft,
                        fontSize: 14,
                        cursor: "pointer",
                        fontFamily: BIB.tekst,
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                {verhaalKeuze === null && !genereerBezig ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      padding: isMobile ? "10px 0" : "20px 0",
                    }}
                  >
                    <div
                      style={{
                        background: BIB.wit,
                        border: `1px solid ${BIB.line}`,
                        borderRadius: 6,
                        padding: isMobile ? "18px 18px" : "24px 26px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: BIB.kop,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 1.2,
                          textTransform: "uppercase",
                          color: BIB.antracietSoft,
                          marginBottom: 6,
                        }}
                      >
                        Hoe wil je beginnen?
                      </div>
                      <div
                        style={{
                          fontFamily: BIB.kop,
                          fontSize: 20,
                          fontWeight: 600,
                          color: BIB.antraciet,
                          letterSpacing: -0.2,
                          marginBottom: 14,
                        }}
                      >
                        Schrijf je verhaal zelf, of laat de AI het schrijven
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                          gap: 12,
                        }}
                      >
                        <button
                          onClick={() => setVerhaalKeuze("zelf")}
                          style={{
                            textAlign: "left",
                            padding: "14px 16px",
                            borderRadius: 6,
                            border: `1.5px solid ${BIB.antraciet}`,
                            background: BIB.antraciet,
                            color: BIB.wit,
                            cursor: "pointer",
                            fontFamily: BIB.tekst,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: BIB.kop,
                              fontSize: 15,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            {verhaalTekst.trim()
                              ? "Zelf doorschrijven"
                              : "Zelf schrijven"}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.85,
                              lineHeight: 1.5,
                            }}
                          >
                            {verhaalTekst.trim()
                              ? "Je huidige tekst blijft staan; jij schrijft verder, de coach helpt je aanscherpen."
                              : "Jij schrijft, de coach helpt je aanscherpen."}
                          </div>
                        </button>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <button
                            onClick={() => {
                              if (!alleBouwstenenVol) return;
                              if (verhaalTekst.trim()) {
                                setVerhaalKeuze("ai");
                              } else {
                                genereerVerhaal();
                              }
                            }}
                            disabled={!alleBouwstenenVol || genereerBezig}
                            title={
                              alleBouwstenenVol
                                ? verhaalTekst.trim()
                                  ? "De AI helpt je je huidige tekst aan te scherpen of uit te breiden — je tekst blijft staan."
                                  : "Laat de AI een eerste versie schrijven op basis van jouw bouwstenen"
                                : `Vul eerst alle ${stappen.length} bouwstenen in`
                            }
                            style={{
                              textAlign: "left",
                              padding: "14px 16px",
                              borderRadius: 6,
                              border: `1.5px solid ${
                                alleBouwstenenVol ? BIB.antraciet : BIB.line
                              }`,
                              background: alleBouwstenenVol
                                ? BIB.wit
                                : BIB.beigeSoft,
                              color: alleBouwstenenVol
                                ? BIB.antraciet
                                : BIB.antracietSoft,
                              cursor: alleBouwstenenVol
                                ? "pointer"
                                : "not-allowed",
                              fontFamily: BIB.tekst,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: BIB.kop,
                                fontSize: 15,
                                fontWeight: 600,
                                marginBottom: 4,
                              }}
                            >
                              {verhaalTekst.trim()
                                ? "Laat AI verbeteren of aanvullen"
                                : "Laat AI het verhaal schrijven"}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                lineHeight: 1.5,
                                opacity: alleBouwstenenVol ? 0.85 : 1,
                              }}
                            >
                              {alleBouwstenenVol
                                ? verhaalTekst.trim()
                                  ? "Je tekst blijft staan; vraag de AI in de chat om aanpassingen (langer, andere scène, ander einde…)."
                                  : "Een korte versie op basis van jouw zes bouwstenen."
                                : `Beschikbaar zodra alle ${stappen.length} bouwstenen ingevuld zijn (nu ${gevuldAantal}/${stappen.length}).`}
                            </div>
                          </button>
                          {verhaalTekst.trim() && alleBouwstenenVol && (
                            <button
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    "Je huidige verhaal wordt overschreven met een compleet nieuwe versie. Weet je het zeker?",
                                  )
                                )
                                  return;
                                genereerVerhaal();
                              }}
                              disabled={genereerBezig}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 4,
                                border: "none",
                                background: "transparent",
                                color: BIB.antracietSoft,
                                fontSize: 11.5,
                                fontWeight: 500,
                                cursor: genereerBezig ? "default" : "pointer",
                                fontFamily: BIB.tekst,
                                textAlign: "left",
                                textDecoration: "underline",
                              }}
                            >
                              ↺ of: begin opnieuw vanaf bouwstenen (overschrijft
                              huidige tekst)
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          padding: "10px 12px",
                          background: BIB.beige,
                          borderRadius: 4,
                          fontSize: 12,
                          color: BIB.antraciet,
                          lineHeight: 1.55,
                        }}
                      >
                        <b style={{ fontFamily: BIB.kop, letterSpacing: 0.3 }}>
                          Tip:
                        </b>{" "}
                        kies ook eens een ander taalmodel om het verhaal te
                        genereren — het resultaat kan flink verschillen.
                        Wisselen kan rechtsboven via het knopje{" "}
                        <span
                          style={{
                            display: "inline-block",
                            padding: "1px 8px",
                            borderRadius: 99,
                            background: BIB.antraciet,
                            color: BIB.wit,
                            fontSize: 10.5,
                            letterSpacing: 0.3,
                            verticalAlign: "1px",
                          }}
                        >
                          AI: …
                        </span>{" "}
                        in de zwarte balk bovenaan.
                      </div>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={verhaalTekst}
                    onChange={(e) => {
                      setVerhaalTekst(e.target.value);
                      if (verhaalKeuze === null) setVerhaalKeuze("zelf");
                    }}
                    readOnly={genereerBezig}
                    placeholder={
                      genereerBezig
                        ? "Even geduld — de AI schrijft je verhaal…"
                        : isMobile
                          ? "Begin hier met schrijven. Tik op een zin en vraag feedback via de Coach-tab."
                          : "Begin hier met schrijven. Markeer een zin en vraag links om feedback."
                    }
                    style={{
                      width: "100%",
                      flex: 1,
                      background: BIB.wit,
                      border: `1px solid ${BIB.line}`,
                      borderRadius: 6,
                      padding: isMobile ? "14px 16px" : "18px 22px",
                      paddingBottom: selectie
                        ? isMobile
                          ? 90
                          : 80
                        : isMobile
                          ? 14
                          : 18,
                      fontSize: isMobile ? 16 : 14.5,
                      lineHeight: 1.75,
                      fontFamily: BIB.tekst,
                      color: BIB.antraciet,
                      outline: "none",
                      resize: "none",
                      boxSizing: "border-box",
                      overflow: "auto",
                      transition: "padding-bottom 0.15s",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  padding: "8px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 11.5,
                  color: BIB.antracietSoft,
                  borderTop: `1px solid ${BIB.line}`,
                  background: BIB.wit,
                }}
              >
                <span>
                  <b style={{ color: BIB.antraciet }}>{woordenTelling}</b> woorden
                </span>
                <span>·</span>
                <span>Doel: 300–600 woorden</span>
                <button
                  onClick={() => downloadBackup("handmatig")}
                  title="Download een tekstbestand met al je bouwstenen en je verhaal"
                  style={{
                    marginLeft: "auto",
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: `1px solid ${BIB.line}`,
                    background: BIB.wit,
                    color: BIB.antraciet,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                    letterSpacing: 0.2,
                  }}
                >
                  ⤓ Download backup
                </button>
              </div>
              {selectie && fase === 2 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 56,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: BIB.antraciet,
                    color: BIB.wit,
                    padding: "9px 12px",
                    borderRadius: 4,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    zIndex: 15,
                    boxShadow: "0 8px 24px rgba(57,55,58,0.3)",
                    maxWidth: "92%",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                      marginRight: 4,
                    }}
                  >
                    Over deze zin:
                  </span>
                  {[
                    { l: "Feedback", v: "Geef feedback op deze zin." },
                    { l: "Te vaag?", v: "Is deze zin te vaag? Wat kan concreter?" },
                    { l: "Filmischer", v: "Hoe maak ik deze zin filmischer?" },
                    { l: "Korter", v: "Kan deze zin korter en sterker?" },
                  ].map((o) => (
                    <button
                      key={o.l}
                      onClick={() => vraagOverSelectie(o.v)}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 99,
                        border: "none",
                        background: "rgba(255,255,255,0.14)",
                        color: BIB.wit,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: BIB.tekst,
                      }}
                    >
                      {o.l}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectie("")}
                    style={{
                      padding: "5px 8px",
                      borderRadius: 99,
                      border: "none",
                      background: "transparent",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: BIB.tekst,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
