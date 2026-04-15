"use client";

import { useMemo } from "react";
import { COLOR, FONT } from "@/styles/driifTokens";
import { normalizeBearingDeg } from "@/types/radarMissionDraft";

export type RadarBearingPreviewProps = {
  /** Degrees clockwise from north (0–360). */
  horizontalBearingDeg: number;
  /** Half-angle of the sweep wedge in degrees (each side of boresight). */
  sweepHalfAngleDeg?: number;
  className?: string;
};

const CX = 100;
const CY = 100;
const R = 82;
const DEFAULT_SWEEP_HALF = 52;

/**
 * Schematic radar sweep (Figma-style): blue wedge rotates with horizontal bearing.
 * 0° = north (up); positive = clockwise.
 */
export function RadarBearingPreview({
  horizontalBearingDeg,
  sweepHalfAngleDeg = DEFAULT_SWEEP_HALF,
  className = "",
}: RadarBearingPreviewProps) {
  const bearing = normalizeBearingDeg(horizontalBearingDeg);

  const wedgePath = useMemo(() => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const half = sweepHalfAngleDeg;
    const mid = -90;
    const a1 = rad(mid - half);
    const a2 = rad(mid + half);
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY + R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY + R * Math.sin(a2);
    return `M ${CX} ${CY} L ${x1} ${y1} L ${x2} ${y2} Z`;
  }, [sweepHalfAngleDeg]);

  const labelStyle = {
    fill: COLOR.missionsTitleMuted,
    fontFamily: `${FONT.family}, sans-serif`,
    fontSize: FONT.sizeXs,
    fontWeight: FONT.weightMedium,
  } as const;

  return (
    <div className={className} aria-hidden>
      <svg
        width="100%"
        viewBox="0 0 200 200"
        className="w-full"
        style={{
          maxWidth: 220,
          /* TODO: token — schematic max size from Figma 853:10308 */
          maxHeight: 220,
        }}
      >
        <circle
          cx={CX}
          cy={CY}
          r={94}
          fill="none"
          stroke={COLOR.missionCreateFieldBorder}
          strokeWidth={1}
        />
        <text x={CX} y={14} textAnchor="middle" style={labelStyle}>
          N
        </text>
        <text x={186} y={CY + 4} textAnchor="middle" style={labelStyle}>
          E
        </text>
        <text x={CX} y={196} textAnchor="middle" style={labelStyle}>
          S
        </text>
        <text x={14} y={CY + 4} textAnchor="middle" style={labelStyle}>
          W
        </text>

        <g transform={`rotate(${bearing} ${CX} ${CY})`}>
          <path
            d={wedgePath}
            fill={COLOR.missionCreateDatePickerSelection}
            fillOpacity={0.55}
            stroke={COLOR.missionCreateDatePickerSelection}
            strokeWidth={1}
            strokeOpacity={0.9}
          />
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R}
            stroke={COLOR.missionCreateDatePickerSelection}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>

        <circle cx={CX} cy={CY} r={5} fill={COLOR.missionsBodyText} />
      </svg>
    </div>
  );
}
