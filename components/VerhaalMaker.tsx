"use client";

import React from "react";
import { BIB } from "@/lib/tokens";
import { BIB_STAPPEN, BOUWSTEEN_ICON, WAAROM } from "@/lib/stappen";
import { BibLogo } from "./BibLogo";
import { PijlerRij } from "./PijlerRij";
import { BibIcon, type IconName } from "./BibIcon";
import { KrullUnder } from "./KrullUnder";
import { BibBadge } from "./BibBadge";
import { BibFaseStap } from "./BibFaseStap";
import { BibAutoSaveDot } from "./BibAutoSaveDot";
import { BibOnboarding } from "./BibOnboarding";
import { BibKlaarScherm } from "./BibKlaarScherm";
import { ModelSelector, type BeschikbaarModel } from "./ModelSelector";

const LS_KEY_BIB = "verhaalmaker.bib.v1";
const LS_KEY_MODEL = "verhaalmaker.model.v1";

type Bericht = {
  van: "bot" | "ik";
  tekst: string;
  fase?: 1 | 2;
  isError?: boolean;
};

type Leerling = { naam: string; klas: string };

type SavedState = Partial<{
  fase: 1 | 2;
  stap: number;
  bouwstenen: Record<string, string>;
  verhaalTitel: string;
  verhaalTekst: string;
  auteur: string;
  leerling: Leerling;
  berichten: Bericht[];
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
  const [promptInfoOpen, setPromptInfoOpen] = React.useState(false);

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
  const [auteur, setAuteur] = React.useState("");
  const [onboarding, setOnboarding] = React.useState(true);
  const [leerling, setLeerling] = React.useState<Leerling>({ naam: "", klas: "" });
  const [klaar, setKlaar] = React.useState(false);
  const [laatsteVraag, setLaatsteVraag] = React.useState<
    { vraag: string; extraContext?: string } | null
  >(null);

  const [lastSave, setLastSave] = React.useState(Date.now());
  const [berichten, setBerichten] = React.useState<Bericht[]>([
    {
      van: "bot",
      tekst:
        "Hoi! Leuk dat je meedoet.\n\nWe werken in twee stappen:\n**Stap 1** — bouwstenen verzamelen (rechts)\n**Stap 2** — jij schrijft, ik help je aanscherpen\n\nMet welke bouwsteen wil je beginnen?",
    },
  ]);

  const [modellen, setModellen] = React.useState<BeschikbaarModel[]>([]);
  const [modelId, setModelId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const saved = loadLS();
    if (saved.fase) setFase(saved.fase);
    if (typeof saved.stap === "number") setStap(saved.stap);
    if (saved.bouwstenen) setBouwstenen((b) => ({ ...b, ...saved.bouwstenen }));
    if (saved.verhaalTitel) setVerhaalTitel(saved.verhaalTitel);
    if (saved.verhaalTekst) setVerhaalTekst(saved.verhaalTekst);
    if (saved.auteur) setAuteur(saved.auteur);
    if (saved.leerling?.naam) {
      setLeerling(saved.leerling);
      setOnboarding(false);
    }
    if (saved.berichten && saved.berichten.length) setBerichten(saved.berichten);
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
    saveLS({
      fase,
      stap,
      bouwstenen,
      verhaalTitel,
      verhaalTekst,
      auteur,
      leerling,
      berichten: berichten.slice(-20),
    });
    setLastSave(Date.now());
  }, [
    hydrated,
    fase,
    stap,
    bouwstenen,
    verhaalTitel,
    verhaalTekst,
    auteur,
    leerling,
    berichten,
  ]);

  React.useEffect(() => {
    if (modelId) localStorage.setItem(LS_KEY_MODEL, modelId);
  }, [modelId]);

  const gevuldAantal = Object.values(bouwstenen).filter(
    (v) => v && v.trim().length >= 10,
  ).length;
  const klaarVoorSchrijven = gevuldAantal >= 4;

  React.useEffect(() => {
    if (fase === 2 && !berichten.some((b) => b.fase === 2)) {
      setBerichten((b) => [
        ...b,
        {
          van: "bot",
          fase: 2,
          tekst:
            "Mooi, stap 2! Jij schrijft — ik lees mee.\n\nMarkeer een zin en klik op **Feedback op selectie** voor gerichte tips.",
        },
      ]);
    }
  }, [fase, berichten]);

  const verstuur = async (extraContext?: string, retryVraag?: string) => {
    const vraag = retryVraag || input;
    if (!vraag.trim() || bezig) return;
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
        }),
      });
      if (!res.ok || !res.body) throw new Error("coach faalt");

      const botIndex = await new Promise<number>((resolve) => {
        setBerichten((b) => {
          const next = [...b, { van: "bot" as const, tekst: "" }];
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
          copy[botIndex] = { van: "bot", tekst: acc };
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

  const promptRegels = () => {
    const gevuld = Object.entries(bouwstenen).filter(([, v]) => v.trim());
    const regels: { label: string; waarde: string; soort: string }[] = [
      {
        label: "Rol AI",
        waarde: "Aanscherp-coach — schrijft niet voor jou.",
        soort: "basis",
      },
    ];
    gevuld.forEach(([n, v]) => {
      const titel = stappen[+n - 1]?.titel ?? `Stap ${n}`;
      regels.push({ label: titel, waarde: v, soort: "bouwsteen" });
    });
    if (fase === 2) {
      regels.push({
        label: "Jouw tekst",
        waarde: `${verhaalTekst.trim().split(/\s+/).filter(Boolean).length} woorden eigen werk`,
        soort: "basis",
      });
    }
    regels.push({
      label: "Feedback",
      waarde:
        "Vragen stellen, vage zinnen aanwijzen, voorbeelden geven. NOOIT zelf schrijven.",
      soort: "basis",
    });
    return regels;
  };

  const berekenBadges = () => {
    const b: string[] = [];
    const alles = Object.values(bouwstenen).join(" ").toLowerCase();
    if (bouwstenen["1"] && /\d/.test(bouwstenen["1"])) b.push("Concreet personage");
    if (
      bouwstenen["2"] &&
      /\d{4}|jaar|herfst|winter|lente|zomer|ochtend|avond|nacht/.test(
        bouwstenen["2"].toLowerCase(),
      )
    )
      b.push("Tijd-gelaagd");
    if (/hoor|geluid|zien|voel|ruik|smaak/.test(alles)) b.push("Zintuigen erbij");
    if (bouwstenen["4"] && bouwstenen["4"].length > 20) b.push("Helder conflict");
    if (Object.values(bouwstenen).filter((v) => v && v.length > 40).length >= 5)
      b.push("Rijke context");
    if (verhaalTekst.split(/\s+/).length > 100) b.push("Eigen zinnen");
    return b;
  };

  const woordenTelling = verhaalTekst.trim()
    ? verhaalTekst.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const auteurNaam = auteur || leerling.naam;

  const exporteerWord = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${verhaalTitel}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; line-height: 1.7; color: ${BIB.antraciet};">
<h1 style="font-family: Georgia, serif;">${verhaalTitel}</h1>${auteurNaam ? `<p style="color:#6a6870;font-style:italic;">door ${auteurNaam}${leerling.klas ? ` · ${leerling.klas}` : ""}</p>` : ""}
${verhaalTekst.split("\n\n").map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n")}
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
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${verhaalTitel}</title>
<style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;line-height:1.7;color:${BIB.antraciet};padding:20px}h1{font-family:Georgia,serif;font-size:28px;margin-bottom:4px}.a{color:#6a6870;font-style:italic;margin-bottom:28px}p{margin:0 0 14px}@media print{body{margin:0}}</style></head>
<body><h1>${verhaalTitel}</h1>${auteurNaam ? `<div class="a">door ${auteurNaam}${leerling.klas ? ` · ${leerling.klas}` : ""}</div>` : ""}
${verhaalTekst.split("\n\n").map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n")}
<script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
    w.document.close();
  };

  const mailVerhaal = () => {
    const o = prompt("Naar welk mailadres?");
    if (!o) return;
    const body = `Hoi,\n\nHier is mijn verhaal "${verhaalTitel}"${auteurNaam ? ` van ${auteurNaam}` : ""}, gemaakt bij de workshop Verhaalmaker van de Bibliotheek.\n\n---\n\n${verhaalTekst}\n\n---\n\nGroeten!`;
    window.location.href = `mailto:${o}?subject=${encodeURIComponent(`Mijn verhaal: ${verhaalTitel}`)}&body=${encodeURIComponent(body)}`;
  };

  const chipBtn: React.CSSProperties = {
    padding: "5px 10px",
    borderRadius: 99,
    border: `1px solid ${BIB.line}`,
    background: BIB.wit,
    color: BIB.antracietSoft,
    fontSize: 11,
    fontWeight: 400,
    cursor: "pointer",
    fontFamily: BIB.tekst,
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
        gridTemplateRows: "auto auto 1fr",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes bibBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4 } 40% { transform: translateY(-4px); opacity: 1 } }
        @keyframes bibPulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
        @keyframes bibFadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        .bib-msg { animation: bibFadeIn 0.24s ease both; }
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

      {klaar && (
        <BibKlaarScherm
          titel={verhaalTitel}
          tekst={verhaalTekst}
          auteur={auteurNaam}
          klas={leerling.klas}
          badges={berekenBadges()}
          onDicht={() => setKlaar(false)}
          onWord={exporteerWord}
          onPdf={exporteerPdf}
          onMail={mailVerhaal}
          onReset={() => {
            if (
              confirm(
                "Weet je zeker dat je opnieuw wilt beginnen? Je huidige verhaal wordt gewist.",
              )
            ) {
              localStorage.removeItem(LS_KEY_BIB);
              location.reload();
            }
          }}
        />
      )}

      {/* TOP BAR */}
      <div
        style={{
          background: BIB.antraciet,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            background: BIB.wit,
            padding: "6px 10px 6px 12px",
            borderRadius: 2,
          }}
        >
          <BibLogo subnaam={subnaam} height={28} />
        </div>
        <PijlerRij actief="Lees" klein />
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BibAutoSaveDot lastSave={lastSave} />
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
          padding: "16px 24px 14px",
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontFamily: BIB.kop,
              fontSize: 26,
              fontWeight: 500,
              color: BIB.antraciet,
              letterSpacing: -0.2,
              lineHeight: 1,
            }}
          >
            Verhaalmaker
          </div>
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
        </div>

        <div
          style={{
            width: 1,
            alignSelf: "stretch",
            background: BIB.line,
            margin: "0 4px",
          }}
        />

        <BibFaseStap
          nr={1}
          titel="Stap 1"
          subtitel="Bouwstenen verzamelen"
          aktief={fase === 1}
          gedaan={fase > 1}
          onClick={() => setFase(1)}
        />
        <span style={{ color: BIB.antracietSoft, fontSize: 16 }}>›</span>
        <BibFaseStap
          nr={2}
          titel="Stap 2"
          subtitel="Jouw verhaal schrijven"
          aktief={fase === 2}
          gedaan={false}
          onClick={() => setFase(2)}
        />

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {fase === 1 && (
            <>
              <div style={{ fontSize: 12, color: BIB.antracietSoft }}>
                <b
                  style={{
                    color: klaarVoorSchrijven ? BIB.levendig : BIB.antraciet,
                    fontFamily: BIB.tekst,
                  }}
                >
                  {gevuldAantal}
                </b>
                /{stappen.length} bouwstenen
              </div>
              <button
                onClick={() => klaarVoorSchrijven && setFase(2)}
                disabled={!klaarVoorSchrijven}
                style={{
                  padding: "9px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: klaarVoorSchrijven ? BIB.antraciet : BIB.beigeSoft,
                  color: klaarVoorSchrijven ? BIB.wit : BIB.antracietSoft,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: BIB.tekst,
                  cursor: klaarVoorSchrijven ? "pointer" : "not-allowed",
                  letterSpacing: 0.2,
                }}
              >
                Klaar om te schrijven →
              </button>
            </>
          )}
          {fase === 2 && (
            <button
              onClick={() => setKlaar(true)}
              style={{
                padding: "9px 16px",
                borderRadius: 4,
                border: "none",
                background: BIB.antraciet,
                color: BIB.wit,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: BIB.tekst,
                cursor: "pointer",
                letterSpacing: 0.2,
              }}
            >
              Ik ben klaar →
            </button>
          )}
        </div>
      </div>

      {/* HOOFDZONE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "400px 1fr",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* LINKS — coach */}
        <div
          style={{
            background: BIB.wit,
            borderRight: `1px solid ${BIB.line}`,
            display: "flex",
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
                background: BIB.beige,
                display: "grid",
                placeItems: "center",
              }}
            >
              <BibIcon name="chat" size={15} stroke={1.8} />
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
              onClick={() => setPromptInfoOpen(!promptInfoOpen)}
              style={{
                padding: "5px 10px",
                borderRadius: 99,
                border: `1px solid ${BIB.line}`,
                background: promptInfoOpen ? BIB.beige : BIB.wit,
                color: BIB.antraciet,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: BIB.tekst,
                letterSpacing: 0.2,
              }}
            >
              Wat weet de AI?
            </button>
          </div>

          {promptInfoOpen && (
            <>
              <div
                onClick={() => setPromptInfoOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 9 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 62,
                  left: 16,
                  right: 16,
                  zIndex: 10,
                  background: BIB.wit,
                  border: `1px solid ${BIB.line}`,
                  borderRadius: 6,
                  boxShadow: "0 8px 28px rgba(57,55,58,0.14)",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    background: BIB.beige,
                    borderBottom: `1px solid ${BIB.line}`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: BIB.kop,
                        fontSize: 13,
                        fontWeight: 600,
                        color: BIB.antraciet,
                      }}
                    >
                      Wat weet de AI over jouw verhaal?
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: BIB.antracietSoft,
                        marginTop: 2,
                        lineHeight: 1.45,
                      }}
                    >
                      Wat jij invult in de bouwstenen gaat automatisch mee naar de AI. Hoe concreter, hoe gerichter de feedback.
                    </div>
                  </div>
                  <button
                    onClick={() => setPromptInfoOpen(false)}
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
                    }}
                  >
                    ×
                  </button>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    maxHeight: 320,
                    overflow: "auto",
                    fontFamily: BIB.tekst,
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {promptRegels().map((r, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 7px",
                          borderRadius: 3,
                          background:
                            r.soort === "bouwsteen"
                              ? BIB.beige
                              : `${BIB.antracietSoft}22`,
                          color: BIB.antraciet,
                          fontFamily: BIB.tekst,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          marginRight: 6,
                          textTransform: "uppercase",
                        }}
                      >
                        {r.label}
                      </span>
                      <span>{r.waarde}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderTop: `1px solid ${BIB.line}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: BIB.kop,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: BIB.antracietSoft,
                      marginBottom: 6,
                    }}
                  >
                    Verdiend
                  </div>
                  {(() => {
                    const b = berekenBadges();
                    return b.length ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                        }}
                      >
                        {b.map((naam, i) => (
                          <BibBadge key={i}>{naam}</BibBadge>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 11,
                          color: BIB.antracietSoft,
                          fontStyle: "italic",
                        }}
                      >
                        Nog geen badges. Maak bouwstenen concreter!
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* BERICHTEN */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "18px 20px",
              background: BIB.wit,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {berichten.map((b, i) => (
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
                      background: b.van === "bot" ? BIB.beige : BIB.wit,
                      border: b.van === "ik" ? `1.5px solid ${BIB.antraciet}` : "none",
                      color: BIB.antraciet,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <BibIcon
                      name={b.van === "bot" ? "chat" : "user"}
                      size={13}
                      stroke={1.8}
                    />
                  </div>
                  <div
                    style={{
                      maxWidth: "82%",
                      background:
                        b.van === "bot"
                          ? b.isError
                            ? "#fdebe5"
                            : BIB.beige
                          : BIB.wit,
                      color: BIB.antraciet,
                      padding: "10px 13px",
                      borderRadius: 6,
                      border:
                        b.van === "ik"
                          ? `1.5px solid ${BIB.antraciet}`
                          : b.isError
                            ? `1px solid ${BIB.vaag}60`
                            : "none",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      fontFamily: BIB.tekst,
                    }}
                  >
                    {b.tekst.split(/(\*\*[^*]+\*\*)/g).map((s, k) =>
                      s.startsWith("**") && s.endsWith("**") ? (
                        <strong key={k} style={{ fontWeight: 700 }}>
                          {s.slice(2, -2)}
                        </strong>
                      ) : (
                        <React.Fragment key={k}>{s}</React.Fragment>
                      ),
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
              ))}
              {bezig && (
                <div style={{ display: "flex", gap: 9 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: BIB.beige,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <BibIcon name="chat" size={13} stroke={1.8} />
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      background: BIB.beige,
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

          {/* SUGGESTIE-CHIPS + INPUT */}
          <div
            style={{
              padding: "10px 20px 14px",
              borderTop: `1px solid ${BIB.line}`,
              background: BIB.wit,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              {(fase === 1
                ? ["Hoe kan deze bouwsteen scherper?", "Wat mist er?", "Geef een voorbeeld"]
                : ["Is mijn begin sterk?", "Welke zin is vaag?", "Hoe maak ik dit filmischer?"]
              ).map((q) => (
                <button key={q} onClick={() => setInput(q)} style={chipBtn}>
                  {q}
                </button>
              ))}
            </div>
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
                    : "Vraag feedback op jouw verhaal…"
                }
                rows={1}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: BIB.antraciet,
                  fontSize: 13.5,
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
            display: "flex",
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
                              fontSize: 13,
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
                      <div
                        key={i}
                        title={bouwstenen[String(s.n)] || "(leeg)"}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: gevuld ? BIB.beige : "transparent",
                          border: `1px solid ${gevuld ? BIB.antraciet : BIB.line}`,
                          color: gevuld ? BIB.antraciet : BIB.antracietSoft,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "help",
                          fontFamily: BIB.tekst,
                        }}
                      >
                        {s.titel}
                      </div>
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
                <input
                  value={auteur}
                  onChange={(e) => setAuteur(e.target.value)}
                  placeholder="door…"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: BIB.antracietSoft,
                    fontSize: 12.5,
                    fontStyle: "italic",
                    fontFamily: BIB.tekst,
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "6px 20px 10px",
                  minHeight: 0,
                  display: "flex",
                }}
              >
                <textarea
                  value={verhaalTekst}
                  onChange={(e) => setVerhaalTekst(e.target.value)}
                  placeholder="Begin hier met schrijven. Markeer een zin en vraag links om feedback."
                  style={{
                    width: "100%",
                    flex: 1,
                    background: BIB.wit,
                    border: `1px solid ${BIB.line}`,
                    borderRadius: 6,
                    padding: "18px 22px",
                    fontSize: 14.5,
                    lineHeight: 1.75,
                    fontFamily: BIB.tekst,
                    color: BIB.antraciet,
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                    overflow: "auto",
                  }}
                />
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
                <span>Doel: 300–600 woorden (1–2 pagina&apos;s)</span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    fontStyle: "italic",
                  }}
                >
                  Markeer een zin voor gerichte feedback
                </span>
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
