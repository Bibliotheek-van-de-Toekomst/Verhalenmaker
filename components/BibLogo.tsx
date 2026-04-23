"use client";

import { BIB } from "@/lib/tokens";

type Props = {
  subnaam?: string;
  height?: number;
};

export function BibLogo({ subnaam, height = 34 }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: BIB.kop }}>
      <img
        src="/logo.jpg"
        alt="Brainport Bibliotheken"
        style={{ display: "block", height, width: "auto" }}
      />
      {subnaam && (
        <span
          style={{
            fontFamily: BIB.kop,
            fontSize: Math.round(height * 0.42),
            color: BIB.antraciet,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: 0.2,
          }}
        >
          {subnaam}
        </span>
      )}
    </div>
  );
}
