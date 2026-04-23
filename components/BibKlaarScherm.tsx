"use client";

import React from "react";
import { BIB } from "@/lib/tokens";
import { BibLogo } from "./BibLogo";
import { BibIcon, type IconName } from "./BibIcon";
import { BibBadge } from "./BibBadge";

type Props = {
  titel: string;
  tekst: string;
  auteur: string;
  klas: string;
  badges: string[];
  onDicht: () => void;
  onWord: () => void;
  onPdf: () => void;
  onMail: () => void;
  onReset: () => void;
};

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
  tekst,
  auteur,
  klas,
  badges,
  onDicht,
  onWord,
  onPdf,
  onMail,
  onReset,
}: Props) {
  const woorden = tekst.trim() ? tekst.trim().split(/\s+/).filter(Boolean).length : 0;
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
          <div
            style={{
              fontFamily: BIB.kop,
              fontSize: 22,
              fontWeight: 600,
              color: BIB.antraciet,
              marginBottom: 3,
              letterSpacing: -0.2,
            }}
          >
            {titel || "Verhaal zonder titel"}
          </div>
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

        {badges.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                fontFamily: BIB.kop,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: BIB.antracietSoft,
                marginBottom: 8,
              }}
            >
              Je hebt verdiend
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {badges.map((b, i) => (
                <BibBadge key={i}>{b}</BibBadge>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}
