"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import React from "react";
import { BIB } from "@/lib/tokens";
import { BibLogo } from "./BibLogo";
import { BibIcon, type IconName } from "./BibIcon";
import { BibMedaille } from "./BibMedaille";
import { BADGES, type BadgeId } from "@/lib/badges";
import { BIB_STAPPEN } from "@/lib/stappen";

const BOEKBOT_URL = "https://Boekbot.nl";

type Props = {
  titel: string;
  onTitelChange: (titel: string) => void;
  tekst: string;
  auteur: string;
  klas: string;
  bouwstenen: Record<string, string>;
  modelId?: string | null;
  verdiendeBadges: Set<BadgeId>;
  onDicht: () => void;
  onWord: () => void;
  onPdf: () => void;
  onMail: () => void;
  onReset: () => void;
};

// Boekbot zoekt op thema en sfeer en weigert lange berichten. Alle zes de
// bouwstenen letterlijk doorgeven leverde ruim duizend tekens op en werd
// afgewezen. De AI destilleert er daarom eerst de kern uit.
function bouwBoekbotPrompt(zoekvraag: string): string {
  return [
    "Welk boek voor jongeren van 14–16 jaar past hierbij?",
    "",
    zoekvraag,
    "",
    "Geef één tot drie boektips met een korte uitleg.",
  ].join("\n");
}

// Terugval als de samenvatting niet lukt: kort, en alleen de bouwstenen die
// iets over thema en sfeer zeggen. Beter een ruwe korte vraag dan geen vraag.
function korteTerugval(bouwstenen: Record<string, string>): string {
  const kort = (n: number, max: number) => {
    const v = (bouwstenen[String(n)] || "").trim().replace(/\s+/g, " ");
    return v.length > max ? `${v.slice(0, max).trimEnd()}…` : v;
  };
  const doel = kort(3, 110);
  const conflict = kort(4, 110);
  const genre = kort(6, 60);
  const delen = [
    doel ? `een verhaal over ${doel}` : "een verhaal",
    conflict ? `met als tegenslag ${conflict}` : "",
    genre ? `sfeer: ${genre}` : "",
  ].filter(Boolean);
  return delen.join(", ");
}

function BibActieKnop({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "16px 8px",
        borderRadius: 4,
        border: `1.5px solid ${hover ? BIB.antraciet : BIB.line}`,
        background: hover ? BIB.beige : BIB.wit,
        color: BIB.antraciet,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: BIB.tekst,
        transition: "all 0.15s",
      }}
    >
      <BibIcon name={icon} size={22} stroke={1.6} />
      {label}
    </button>
  );
}

export function BibKlaarScherm({
  titel,
  onTitelChange,
  tekst,
  auteur,
  klas,
  bouwstenen,
  modelId,
  verdiendeBadges,
  onDicht,
  onWord,
  onPdf,
  onMail,
  onReset,
}: Props) {
  const aantalBadges = verdiendeBadges.size;
  const woorden = tekst.trim() ? tekst.trim().split(/\s+/).filter(Boolean).length : 0;
  const [boekbotOpen, setBoekbotOpen] = React.useState(false);
  const [gekopieerd, setGekopieerd] = React.useState(false);
  const [boekbotPrompt, setBoekbotPrompt] = React.useState("");
  const [boekbotBezig, setBoekbotBezig] = React.useState(false);
  const [boekbotTerugval, setBoekbotTerugval] = React.useState(false);

  const maakBoekbotPrompt = async () => {
    setBoekbotOpen(true);
    setBoekbotBezig(true);
    setBoekbotTerugval(false);
    try {
      const res = await fetch("/api/boekbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bouwstenen, modelId }),
      });
      const data = await res.json();
      if (res.ok && typeof data?.zoekvraag === "string") {
        setBoekbotPrompt(bouwBoekbotPrompt(data.zoekvraag));
      } else {
        setBoekbotPrompt(bouwBoekbotPrompt(korteTerugval(bouwstenen)));
        setBoekbotTerugval(true);
      }
    } catch {
      setBoekbotPrompt(bouwBoekbotPrompt(korteTerugval(bouwstenen)));
      setBoekbotTerugval(true);
    } finally {
      setBoekbotBezig(false);
    }
  };

  const kopieerPrompt = async () => {
    try {
      await navigator.clipboard.writeText(boekbotPrompt);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      setGekopieerd(false);
      alert("Kopiëren is niet gelukt. Selecteer de tekst en kopieer handmatig.");
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(57,55,58,0.68)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        overflow: "auto",
        fontFamily: BIB.tekst,
      }}
    >
      <div
        style={{
          background: BIB.wit,
          borderRadius: 6,
          width: "min(640px, 100%)",
          padding: "36px 40px 30px",
          boxShadow: "0 24px 60px rgba(57,55,58,0.35)",
          position: "relative",
        }}
      >
        <button
          onClick={onDicht}
          aria-label="Sluiten"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 99,
            border: "none",
            background: BIB.beige,
            color: BIB.antraciet,
            fontSize: 16,
            cursor: "pointer",
            fontFamily: BIB.tekst,
          }}
        >
          ×
        </button>
        <div style={{ marginBottom: 20 }}>
          <BibLogo height={44} />
        </div>
        <div
          style={{
            fontFamily: BIB.kop,
            fontSize: 30,
            fontWeight: 600,
            color: BIB.antraciet,
            letterSpacing: -0.5,
            lineHeight: 1.15,
          }}
        >
          Je hebt een verhaal geschreven
        </div>
        <p
          style={{
            margin: "8px 0 22px",
            fontSize: 14,
            color: BIB.antracietSoft,
            lineHeight: 1.55,
          }}
        >
          {woorden} woorden. Goed bezig. Deel het, print het, of schrijf nog even door.
        </p>

        <div
          style={{
            background: BIB.beige,
            borderRadius: 6,
            padding: "20px 24px",
            marginBottom: 22,
          }}
        >
          {!titel.trim() && (
            <div
              style={{
                fontFamily: BIB.tekst,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: BIB.vaag,
                marginBottom: 4,
              }}
            >
              Bedenk nog een titel
            </div>
          )}
          <input
            value={titel}
            onChange={(e) => onTitelChange(e.target.value)}
            placeholder="Bedenk een titel voor je verhaal…"
            autoFocus={!titel.trim()}
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: BIB.kop,
              fontSize: 22,
              fontWeight: 600,
              color: BIB.antraciet,
              letterSpacing: -0.2,
              background: "transparent",
              border: "none",
              borderBottom: titel.trim()
                ? `1px dashed transparent`
                : `1.5px solid ${BIB.vaag}`,
              padding: "2px 0 4px",
              outline: "none",
              marginBottom: 3,
            }}
          />
          {auteur && (
            <div
              style={{
                fontSize: 12.5,
                color: BIB.antracietSoft,
                fontStyle: "italic",
              }}
            >
              door {auteur}
              {klas ? ` · ${klas}` : ""}
            </div>
          )}
          <div
            style={{
              marginTop: 12,
              fontFamily: BIB.tekst,
              fontSize: 13.5,
              color: BIB.antraciet,
              lineHeight: 1.65,
              maxHeight: 130,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {tekst.slice(0, 400)}
            {tekst.length > 400 && "…"}
            {tekst.length > 120 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 40,
                  background: `linear-gradient(transparent, ${BIB.beige})`,
                }}
              />
            )}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
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
              }}
            >
              Je hebt verdiend
            </div>
            <div
              style={{
                fontFamily: BIB.tekst,
                fontSize: 12,
                color: BIB.antracietSoft,
              }}
            >
              <b style={{ color: BIB.antraciet }}>{aantalBadges}</b> van de{" "}
              {BADGES.length} medailles
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "18px 12px",
              justifyItems: "center",
              padding: "4px 0",
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
                  <BibMedaille def={def} behaald={behaald} isNieuw={false} />
                  <div
                    style={{
                      fontSize: 10.5,
                      textAlign: "center",
                      color: behaald ? BIB.antraciet : BIB.antracietSoft,
                      fontWeight: behaald ? 600 : 400,
                      fontFamily: BIB.tekst,
                      lineHeight: 1.3,
                      maxWidth: 100,
                    }}
                  >
                    {def.titel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: BIB.beige,
            borderRadius: 6,
            padding: "16px 20px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontFamily: BIB.kop,
              fontSize: 16,
              fontWeight: 600,
              color: BIB.antraciet,
              letterSpacing: -0.1,
              marginBottom: 4,
            }}
          >
            Bestaat er al zo'n verhaal?
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: BIB.antracietSoft,
              lineHeight: 1.55,
              marginBottom: boekbotOpen ? 12 : 12,
            }}
          >
            Maak een prompt voor <b>Boekbot</b> en ontdek welk bestaand boek bij
            jouw verhaal past.
          </div>

          {!boekbotOpen ? (
            <button
              onClick={maakBoekbotPrompt}
              style={{
                padding: "10px 16px",
                borderRadius: 4,
                border: `1.5px solid ${BIB.antraciet}`,
                background: BIB.antraciet,
                color: BIB.wit,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: BIB.tekst,
                letterSpacing: 0.2,
              }}
            >
              Maak Boekbot-prompt
            </button>
          ) : (
            <>
              {boekbotBezig && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: BIB.antracietSoft,
                    fontFamily: BIB.tekst,
                    marginBottom: 10,
                  }}
                >
                  De AI vat je verhaal samen tot een korte zoekvraag…
                </div>
              )}
              {boekbotTerugval && !boekbotBezig && (
                <div
                  style={{
                    fontSize: 12,
                    color: BIB.vaag,
                    fontFamily: BIB.tekst,
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Samenvatten lukte even niet. Hieronder staat een kortere
                  vraag op basis van je bouwstenen. Je kunt hem zelf nog
                  bijschaven.
                </div>
              )}
              <textarea
                value={boekbotPrompt}
                onChange={(e) => setBoekbotPrompt(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                rows={6}
                style={{
                  width: "100%",
                  background: BIB.wit,
                  border: `1px solid ${BIB.line}`,
                  borderRadius: 4,
                  padding: "10px 12px",
                  fontSize: 12.5,
                  fontFamily: BIB.tekst,
                  color: BIB.antraciet,
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.55,
                  boxSizing: "border-box",
                  marginBottom: 10,
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={kopieerPrompt}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 4,
                    border: `1.5px solid ${BIB.antraciet}`,
                    background: gekopieerd ? BIB.levendig : BIB.antraciet,
                    color: BIB.wit,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                    letterSpacing: 0.2,
                  }}
                >
                  {gekopieerd ? "✓ Gekopieerd" : "Kopieer prompt"}
                </button>
                <a
                  href={BOEKBOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 4,
                    border: `1.5px solid ${BIB.antraciet}`,
                    background: BIB.wit,
                    color: BIB.antraciet,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                    letterSpacing: 0.2,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Open Boekbot →
                </a>
                <button
                  onClick={() => setBoekbotOpen(false)}
                  style={{
                    marginLeft: "auto",
                    padding: "8px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: "transparent",
                    color: BIB.antracietSoft,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                  }}
                >
                  Sluiten
                </button>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <BibActieKnop icon="paper" label="Word" onClick={onWord} />
          <BibActieKnop icon="book" label="PDF" onClick={onPdf} />
          <BibActieKnop icon="mail" label="Mailen" onClick={onMail} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${BIB.line}`,
          }}
        >
          <button
            onClick={onDicht}
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
            }}
          >
            ← Nog even doorschrijven
          </button>
          <button
            onClick={onReset}
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
            Nieuw verhaal
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: `1px dashed ${BIB.line}`,
            fontSize: 10.5,
            color: BIB.antracietSoft,
            fontFamily: BIB.tekst,
            lineHeight: 1.5,
            textAlign: "center",
            letterSpacing: 0.1,
          }}
        >
          Verhalenmaker · © 2026 Brainport Bibliotheken ·{" "}
          <a
            href="https://github.com/Bibliotheek-van-de-Toekomst/Verhalenmaker"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: BIB.antracietSoft, textDecoration: "underline" }}
          >
            Broncode (AGPL-3.0)
          </a>
        </div>
      </div>
    </div>
  );
}
