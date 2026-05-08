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
          padding: "6px 12px 6px 6px",
          borderRadius: 99,
          border: "none",
          background: open ? BIB.beige : BIB.wit,
          color: BIB.antraciet,
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: BIB.tekst,
          cursor: "pointer",
          letterSpacing: 0.3,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = BIB.beige;
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = BIB.wit;
        }}
      >
        <span
          aria-hidden
          style={{
            padding: "1px 8px",
            borderRadius: 99,
            background: BIB.antraciet,
            color: BIB.wit,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            fontFamily: BIB.kop,
          }}
        >
          AI
        </span>
        <span>{huidig?.label ?? "kies model"}</span>
        <span style={{ opacity: 0.55, fontSize: 9 }}>▾</span>
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
