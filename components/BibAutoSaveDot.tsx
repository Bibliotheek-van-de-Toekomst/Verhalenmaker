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
