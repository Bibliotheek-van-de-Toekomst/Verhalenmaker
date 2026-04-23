"use client";

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
