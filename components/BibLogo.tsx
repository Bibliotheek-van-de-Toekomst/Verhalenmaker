"use client";

import { BIB } from "@/lib/tokens";

type Props = {
  subnaam?: string;
  height?: number;
};

export function BibLogo({ subnaam, height = 34 }: Props) {
  const w = subnaam ? 148 : 134;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, fontFamily: BIB.kop }}>
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} 34`}
        style={{ display: "block" }}
      >
        <text
          x="0"
          y="25"
          fontFamily="Georgia, serif"
          fontSize="22"
          fontWeight="400"
          fill={BIB.antraciet}
          letterSpacing="-0.3"
        >
          <tspan fontStyle="italic" fontWeight="500">de</tspan>{" "}
          <tspan fontWeight="600">Bibliotheek</tspan>
        </text>
        <g transform={`translate(${w - 22}, 4)`}>
          <path
            d="M0 18 Q 0 0, 18 0 Q 18 10, 18 18 Q 9 18, 0 18 Z"
            fill={BIB.oranje}
          />
          <path
            d="M3 4 Q 3 3, 4 3 L 14 3 Q 15 3, 15 4 L 15 6 Q 15 7, 14 7 L 4 7 Q 3 7, 3 6 Z"
            fill={BIB.oranje}
            opacity="0.4"
          />
        </g>
      </svg>
      {subnaam && (
        <span
          style={{
            fontFamily: BIB.kop,
            fontSize: Math.round(height * 0.42),
            color: BIB.antraciet,
            fontWeight: 600,
            lineHeight: 1,
            paddingBottom: 2,
            letterSpacing: 0.2,
          }}
        >
          {subnaam}
        </span>
      )}
    </div>
  );
}
