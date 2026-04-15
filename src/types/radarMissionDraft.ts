/**
 * Pre-mission radar configuration draft (Create Mission → Configure).
 * Align fields with backend `DeviceConfig` when API contract is finalized.
 */

export type RadarConfigureDraft = {
  /** Horizontal bearing: degrees clockwise from north, 0–360. Drives live preview. */
  horizontalBearingDeg: number;
  /** Pitch / vertical tilt (Figma 853:10308 Direction tab, −40°…+90°). */
  verticalElevationDeg: number;
  /** Mount height in metres. */
  mountHeightM: number;
};

export function normalizeBearingDeg(deg: number): number {
  const x = ((deg % 360) + 360) % 360;
  return x;
}

export function clampElevationDeg(deg: number): number {
  return Math.min(90, Math.max(-40, deg));
}

export function clampMountHeightM(m: number): number {
  if (!Number.isFinite(m) || m < 0) return 0;
  return Math.min(99999, m);
}
