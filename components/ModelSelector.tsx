"use client";

import React from "react";
import { BIB } from "@/lib/tokens";

export type BeschikbaarModel = {
  id: string;
  label: string;
  provider: string;
  beschrijving: string;
};

type Props = {
  modellen: BeschikbaarModel[];
  huidigId: string | null;
  onKies: (id: string) => void;
};

export function ModelSelector({ modellen, huidigId, onKies }: Props) {
  const [open, setOpen] = React.useState(false);
  const huidig = modellen.find((m) => m.id === huidigId) ?? modellen[0];

  if (modellen.length === 0) {
    return (
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 99,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "transparent",
          color: BIB.vaag,
          fontSize: 10.5,
          fontFamily: BIB.tekst,
          letterSpacing: 0.3,
        }}
      >
        Geen model beschikbaar
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          padding: "4px 10px",
          borderRadius: 99,
          border: "1px solid rgba(255,255,255,0.2)",
          background: open ? "rgba(255,255,255,0.12)" : "transparent",
          color: "rgba(255,255,255,0.85)",
          fontSize: 10.5,
          fontFamily: BIB.tekst,
          cursor: "pointer",
          letterSpacing: 0.3,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>AI: {huidig?.label ?? "kies model"}</span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>▾</span>
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 19 }}
          />
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 20,
              minWidth: 260,
              background: BIB.wit,
              border: `1px solid ${BIB.line}`,
              borderRadius: 6,
              boxShadow: "0 8px 28px rgba(57,55,58,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${BIB.line}`,
                background: BIB.beige,
                fontFamily: BIB.kop,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: BIB.antraciet,
              }}
            >
              Kies een AI-model
            </div>
            {modellen.map((m) => {
              const actief = m.id === huidig?.id;
              return (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={actief}
                  onClick={() => {
                    onKies(m.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    border: "none",
                    background: actief ? BIB.beigeSoft : BIB.wit,
                    color: BIB.antraciet,
                    cursor: "pointer",
                    fontFamily: BIB.tekst,
                    borderBottom: `1px solid ${BIB.line}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: BIB.kop,
                      fontSize: 13,
                      fontWeight: 600,
                      color: BIB.antraciet,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {m.label}
                    {actief && (
                      <span
                        style={{
                          fontSize: 10,
                          color: BIB.levendig,
                          fontWeight: 700,
                        }}
                      >
                        ✓ actief
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: BIB.antracietSoft,
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {m.beschrijving}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
