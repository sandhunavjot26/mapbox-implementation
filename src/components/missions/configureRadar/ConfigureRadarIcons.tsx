"use client";

import { COLOR } from "@/styles/driifTokens";

export function ConfigureRadarPlusGlyph({
  size = 16,
  color = COLOR.missionsTitleMuted,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
