"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


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
