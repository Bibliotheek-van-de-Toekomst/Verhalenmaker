"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


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
