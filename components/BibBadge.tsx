"use client";

import { BIB } from "@/lib/tokens";

export function BibBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "4px 11px",
        borderRadius: 99,
        background: BIB.beige,
        color: BIB.antraciet,
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: BIB.tekst,
        border: `1px solid ${BIB.antraciet}22`,
      }}
    >
      {children}
    </div>
  );
}
