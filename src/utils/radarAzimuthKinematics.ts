/**
 * Client-side azimuth smoothing between sparse DeviceState samples (~dt=1 heartbeats).
 * Ported from old-ui `useRadarKinematics.ts` (V2.11 E.7 / E.7.2) — Mapbox layer uses a
 * module singleton instead of React state because the animate loop lives outside React.
 */

/** Threshold (deg/sec): below this, treat device as stationary (avoid jitter). */
const ROTATION_DEAD_BAND_DPS = 5;

const MAX_INFERRED_DPS = 80;

const RATE_CHANGE_THRESHOLD_DPS = 5;

const DRIFT_CORRECTION_THRESHOLD_DEG = 8;

type Kinematics = {
  animatedAz: number;
  dps: number;
  lastSampleAz: number;
  lastSampleTs: number;
};

const kinById = new Map<string, Kinematics>();

function signedAngleDelta(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function normAz(a: number): number {
  return ((a % 360) + 360) % 360;
}

/** Drop all smoothed state (e.g. map teardown). */
export function clearRadarAzimuthKinematics(): void {
  kinById.clear();
}

export function advanceRadarAzimuthAnimation(frameDtSec: number): void {
  if (!(frameDtSec > 0)) return;
  for (const k of kinById.values()) {
    if (k.dps === 0) continue;
    k.animatedAz = normAz(k.animatedAz + k.dps * frameDtSec);
  }
}

export function getAnimatedRadarAzimuth(deviceId: string): number | undefined {
  return kinById.get(deviceId)?.animatedAz;
}

export type RadarAzimuthSampleAsset = {
  id: string;
  protocol?: string | null;
};

/**
 * Ingest live azimuth per asset; prune kinematics for ids no longer reporting azimuth.
 * Skips D20 — old-ui drives that wedge with a FE-only sweep (no turntable azimuth).
 */
export function syncRadarAzimuthSamples(
  assets: readonly RadarAzimuthSampleAsset[],
  liveById: Record<string, { azimuth_deg?: number } | undefined>,
  nowMs: number,
): void {
  const seen = new Set<string>();

  for (const asset of assets) {
    const proto = String(asset.protocol ?? "").toUpperCase();
    if (proto === "D20") continue;

    const raw = liveById[asset.id]?.azimuth_deg;
    if (raw == null || !Number.isFinite(Number(raw))) continue;

    const az = normAz(Number(raw));
    seen.add(asset.id);

    const existing = kinById.get(asset.id);
    if (!existing) {
      kinById.set(asset.id, {
        animatedAz: az,
        dps: 0,
        lastSampleAz: az,
        lastSampleTs: nowMs,
      });
      continue;
    }

    const azDelta = Math.abs(signedAngleDelta(existing.lastSampleAz, az));
    // Skip duplicate readings only — never tie this to elapsed time.
    //
    // Old React hook used `azDelta < 0.1 && tsDelta < 1500` so parent re-renders
    // without azimuth change did not kill inferred rate. After ~1.5s of silence
    // that guard expired; identical store azimuth then inferred `newDps ≈ 0`,
    // triggered `rateChanged`, and snapped extrapolated `animatedAz` back to the
    // last wire value → smooth wedge then jump-back every ~1–2s on sparse WS.
    if (azDelta < 0.1) continue;

    const dt = (nowMs - existing.lastSampleTs) / 1000;
    let newDps = 0;
    if (dt > 0.05) {
      newDps = signedAngleDelta(existing.lastSampleAz, az) / dt;
      if (Math.abs(newDps) < ROTATION_DEAD_BAND_DPS) newDps = 0;
      if (newDps > MAX_INFERRED_DPS) newDps = MAX_INFERRED_DPS;
      else if (newDps < -MAX_INFERRED_DPS) newDps = -MAX_INFERRED_DPS;
    }

    const rateChanged =
      Math.abs(existing.dps - newDps) > RATE_CHANGE_THRESHOLD_DPS;
    const drift = Math.abs(signedAngleDelta(existing.animatedAz, az));

    if (rateChanged) {
      existing.animatedAz = az;
      existing.dps = newDps;
    } else if (drift > DRIFT_CORRECTION_THRESHOLD_DEG) {
      existing.animatedAz = az;
    }

    existing.lastSampleAz = az;
    existing.lastSampleTs = nowMs;
  }

  for (const id of [...kinById.keys()]) {
    if (!seen.has(id)) kinById.delete(id);
  }
}
