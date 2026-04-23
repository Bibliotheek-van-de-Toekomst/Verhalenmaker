"use client";

import React from "react";
import { BIB } from "@/lib/tokens";
import { BibLogo } from "./BibLogo";

type Leerling = { naam: string; klas: string };

type Props = {
  leerling: Leerling;
  onStart: (naam: string, klas: string) => void;
};

export function BibOnboarding({ leerling, onStart }: Props) {
  const [naam, setNaam] = React.useState(leerling?.naam || "");
  const [klas, setKlas] = React.useState(leerling?.klas || "");
  const [step, setStep] = React.useState(0);
  const kan = naam.trim().length >= 2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(57,55,58,0.55)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        fontFamily: BIB.tekst,
      }}
    >
      <div
        style={{
          background: BIB.wit,
          borderRadius: 6,
          width: "min(540px, 92%)",
          padding: "32px 36px 26px",
          boxShadow: "0 24px 60px rgba(57,55,58,0.3)",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <BibLogo height={30} />
        </div>
        {step === 0 ? (
          <>
            <div
              style={{
                fontFamily: BIB.kop,
                fontSize: 26,
                fontWeight: 600,
                color: BIB.antraciet,
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              Welkom bij Verhaalmaker
            </div>
            <p
              style={{
                margin: "10px 0 22px",
                fontSize: 14.5,
                color: BIB.antracietSoft,
                lineHeight: 1.55,
                fontFamily: BIB.tekst,
              }}
            >
              Jij gaat een kort verhaal schrijven. De AI is je{" "}
              <b style={{ color: BIB.antraciet }}>coach</b> — geen ghostwriter.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[
                {
                  t: "Jij schrijft het verhaal",
                  s: "De AI schrijft geen hele zinnen voor je.",
                },
                {
                  t: "De AI geeft ideeën en tips",
                  s: 'Bijvoorbeeld: "deze zin is vaag" of "voeg een geluid toe".',
                },
                {
                  t: "Jij bepaalt",
                  s: "Gebruik een tip, pas hem aan, of negeer hem gewoon.",
                },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "12px 14px",
                    background: BIB.beige,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 99,
                      background: BIB.antraciet,
                      color: BIB.wit,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: BIB.tekst,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: BIB.kop,
                        fontSize: 14,
                        fontWeight: 600,
                        color: BIB.antraciet,
                      }}
                    >
                      {r.t}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: BIB.antracietSoft,
                        lineHeight: 1.5,
                        marginTop: 2,
                      }}
                    >
                      {r.s}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 4,
                border: "none",
                background: BIB.antraciet,
                color: BIB.wit,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: BIB.tekst,
                letterSpacing: 0.2,
              }}
            >
              Begrepen, verder →
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: BIB.kop,
                fontSize: 26,
                fontWeight: 600,
                color: BIB.antraciet,
                letterSpacing: -0.4,
              }}
            >
              Hoe heet je?
            </div>
            <p
              style={{
                margin: "8px 0 22px",
                fontSize: 14,
                color: BIB.antracietSoft,
                lineHeight: 1.55,
              }}
            >
              Dan zet ik jouw naam onder je verhaal.
            </p>
            <label style={{ display: "block", marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 12,
                  fontWeight: 600,
                  color: BIB.antraciet,
                  marginBottom: 5,
                }}
              >
                Voornaam
              </div>
              <input
                autoFocus
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kan) onStart(naam.trim(), klas.trim());
                }}
                placeholder="bijv. Mira"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 4,
                  border: `1.5px solid ${BIB.line}`,
                  background: BIB.wit,
                  color: BIB.antraciet,
                  fontSize: 15,
                  fontFamily: BIB.tekst,
                  outline: "none",
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 22 }}>
              <div
                style={{
                  fontFamily: BIB.kop,
                  fontSize: 12,
                  fontWeight: 600,
                  color: BIB.antraciet,
                  marginBottom: 5,
                }}
              >
                Klas{" "}
                <span style={{ color: BIB.antracietSoft, fontWeight: 400 }}>
                  (optioneel)
                </span>
              </div>
              <input
                value={klas}
                onChange={(e) => setKlas(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kan) onStart(naam.trim(), klas.trim());
                }}
                placeholder="bijv. 3A"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 4,
                  border: `1.5px solid ${BIB.line}`,
                  background: BIB.wit,
                  color: BIB.antraciet,
                  fontSize: 15,
                  fontFamily: BIB.tekst,
                  outline: "none",
                }}
              />
            </label>
            <button
              onClick={() => kan && onStart(naam.trim(), klas.trim())}
              disabled={!kan}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 4,
                border: "none",
                background: kan ? BIB.antraciet : BIB.beigeSoft,
                color: kan ? BIB.wit : BIB.antracietSoft,
                fontSize: 15,
                fontWeight: 700,
                cursor: kan ? "pointer" : "not-allowed",
                fontFamily: BIB.tekst,
                letterSpacing: 0.2,
              }}
            >
              Aan de slag →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
