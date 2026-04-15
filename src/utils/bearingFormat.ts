import { normalizeBearingDeg } from "@/types/radarMissionDraft";

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function bearingIndex(deg: number): number {
  const b = normalizeBearingDeg(deg);
  return Math.round(b / 45) % 8;
}

/** e.g. `315° NW` — bearing clockwise from north, 0–360. */
export function formatBearingDegreesAndCardinal(deg: number): string {
  const b = normalizeBearingDeg(deg);
  const idx = bearingIndex(deg);
  return `${Math.round(b)}° ${CARDINALS[idx]}`;
}

/** Large degree string + 2-letter cardinal (Figma Configure Radar Direction readout). */
export function formatBearingDegreesAndCardinalParts(deg: number): {
  degrees: string;
  cardinal: string;
} {
  const b = normalizeBearingDeg(deg);
  const idx = bearingIndex(deg);
  return { degrees: `${Math.round(b)}°`, cardinal: CARDINALS[idx] };
}
