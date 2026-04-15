/**
 * Deterministic defaults for radar configure draft before mission exists.
 * TODO: replace with API — e.g. GET device config template or mission-scoped defaults.
 */

import type { RadarConfigureDraft } from "@/types/radarMissionDraft";

function hashDeviceIdToUint(deviceId: string): number {
  let h = 0;
  for (let i = 0; i < deviceId.length; i += 1) {
    h = (h * 31 + deviceId.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Default draft when user opens Configure for a device (no server yet). */
export function defaultRadarConfigureDraft(deviceId: string): RadarConfigureDraft {
  const h = hashDeviceIdToUint(deviceId);
  return {
    horizontalBearingDeg: h % 360,
    verticalElevationDeg: (h % 131) - 40,
    mountHeightM: 0,
  };
}
