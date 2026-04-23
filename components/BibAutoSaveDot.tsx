"use client";

import React from "react";
import { BIB } from "@/lib/tokens";

export function BibAutoSaveDot({ lastSave }: { lastSave: number }) {
  const [dot, setDot] = React.useState(false);
  React.useEffect(() => {
    setDot(true);
    const t = setTimeout(() => setDot(false), 1400);
    return () => clearTimeout(t);
  }, [lastSave]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 10.5,
        color: "rgba(255,255,255,0.65)",
        fontFamily: BIB.tekst,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 99,
          background: dot ? BIB.oranje : BIB.levendig,
          animation: dot ? "bibPulse 0.7s ease-in-out" : "none",
        }}
      />
      {dot ? "opslaan…" : "opgeslagen"}
    </div>
  );
}
