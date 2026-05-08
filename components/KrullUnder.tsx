"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Brainport Bibliotheken
//
// Verhalenmaker is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. See LICENSE.


import { BIB } from "@/lib/tokens";

type Props = { width?: number; color?: string };

export function KrullUnder({ width = 120, color = BIB.antraciet }: Props) {
  return (
    <svg
      width={width}
      height="8"
      viewBox={`0 0 ${width} 8`}
      style={{ display: "block", marginTop: 2 }}
    >
      <path
        d={`M 2 4 Q ${width * 0.2} 7, ${width * 0.4} 3 T ${width * 0.75} 4 T ${width - 3} 4`}
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
