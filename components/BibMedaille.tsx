"use client";

import React from "react";
import { BIB } from "@/lib/tokens";
import { BibIcon } from "./BibIcon";
import type { BadgeDef } from "@/lib/badges";

type Props = {
  def: BadgeDef;
  behaald: boolean;
  isNieuw: boolean;
};

export function BibMedaille({ def, behaald, isNieuw }: Props) {
  const [hover, setHover] = React.useState(false);
  const size = 68;
  const center = size / 2;
  const bodyR = 26;
  const scallopR = 3.8;
  const scallopDist = 26;

  const kleur = behaald ? def.kleur : "#c9c6cb";
  const kleurDonker = behaald ? def.kleurDonker : "#9b98a0";
  const emblemColor = behaald ? BIB.wit : "rgba(255,255,255,0.55)";
  const gradId = `med-${def.id}-${behaald ? "on" : "off"}`;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: size,
        height: size,
        filter: behaald ? undefined : "grayscale(1) opacity(0.7)",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          transform:
            hover && behaald ? "scale(1.08) rotate(-3deg)" : "scale(1) rotate(0deg)",
          transition: "transform 0.2s ease-out",
          animation: isNieuw
            ? "medaillePop 0.7s cubic-bezier(0.2, 1.4, 0.4, 1) 1"
            : undefined,
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <radialGradient id={gradId} cx="30%" cy="28%" r="75%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="40%" stopColor={kleur} />
              <stop offset="100%" stopColor={kleurDonker} />
            </radialGradient>
          </defs>

          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * 2 * Math.PI;
            const cx = center + Math.cos(angle) * scallopDist;
            const cy = center + Math.sin(angle) * scallopDist;
            return (
              <circle key={i} cx={cx} cy={cy} r={scallopR} fill={kleurDonker} />
            );
          })}

          <circle cx={center} cy={center} r={bodyR} fill={`url(#${gradId})`} />

          <circle
            cx={center}
            cy={center}
            r={bodyR - 4}
            fill="none"
            stroke={emblemColor}
            strokeWidth="1"
            strokeOpacity={behaald ? 0.35 : 0.25}
          />

          <ellipse
            cx={center - 6}
            cy={center - 9}
            rx="11"
            ry="5"
            fill="rgba(255,255,255,0.3)"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <BibIcon name={def.embleem} size={22} color={emblemColor} stroke={2} />
        </div>

        {isNieuw && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: bodyR * 2,
              height: bodyR * 2,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.7)",
              animation: "medailleShine 1.4s ease-out 1",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {hover && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: BIB.antraciet,
            color: BIB.wit,
            padding: "8px 11px",
            borderRadius: 4,
            fontSize: 11,
            width: 180,
            zIndex: 20,
            pointerEvents: "none",
            boxShadow: "0 6px 20px rgba(57,55,58,0.3)",
            fontFamily: BIB.tekst,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 2,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              fontSize: 10,
            }}
          >
            {behaald ? "Verdiend" : "Nog te verdienen"}
          </div>
          <div style={{ opacity: 0.9, lineHeight: 1.4 }}>
            {behaald ? def.uitleg : def.hint}
          </div>
        </div>
      )}
    </div>
  );
}
