"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import { BIB, PIJLERS, ACTIEVE_PIJLER } from "@/lib/tokens";

type Props = {
  actief?: string | string[];
  klein?: boolean;
};

export function PijlerRij({ actief = ACTIEVE_PIJLER, klein = false }: Props) {
  const actieveLijst = Array.isArray(actief) ? actief : [actief];
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {PIJLERS.map((p) => {
        const isActief = actieveLijst.includes(p);
        return (
          <div
            key={p}
            style={{
              padding: klein ? "4px 11px" : "6px 14px",
              borderRadius: 99,
              background: isActief ? BIB.wit : "transparent",
              color: BIB.antraciet,
              fontFamily: BIB.kop,
              fontSize: klein ? 11 : 12.5,
              fontWeight: isActief ? 600 : 400,
              letterSpacing: 0.1,
              border: isActief ? "none" : "1px solid transparent",
              opacity: isActief ? 1 : 0.65,
            }}
          >
            {p}
          </div>
        );
      })}
    </div>
  );
}
