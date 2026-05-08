"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import { BIB } from "@/lib/tokens";
import { BibIcon } from "./BibIcon";

type Props = {
  nr: number;
  titel: string;
  subtitel: string;
  aktief: boolean;
  gedaan: boolean;
  onClick: () => void;
};

export function BibFaseStap({ nr, titel, subtitel, aktief, gedaan, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px 6px 10px",
        background: aktief ? BIB.koel : "transparent",
        border: aktief ? `1px solid ${BIB.bubbelRand}` : "1px solid transparent",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: BIB.tekst,
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 99,
          background: aktief || gedaan ? BIB.antraciet : "transparent",
          color: aktief || gedaan ? BIB.wit : BIB.antracietSoft,
          border: aktief || gedaan ? "none" : `1.5px solid ${BIB.antracietSoft}80`,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {gedaan ? <BibIcon name="check" size={13} stroke={2.5} color={BIB.wit} /> : nr}
      </div>
      <div>
        <div
          style={{
            fontFamily: BIB.kop,
            fontSize: 13,
            fontWeight: 600,
            color: BIB.antraciet,
            lineHeight: 1.1,
          }}
        >
          {titel}
        </div>
        <div style={{ fontSize: 11, color: BIB.antracietSoft, marginTop: 2 }}>
          {subtitel}
        </div>
      </div>
    </button>
  );
}
