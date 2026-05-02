/**
 * GeoJSON feature properties for Mapbox radar layers (Task 0 — old-ui semantics).
 * Drives azimuth-backed sectors, optional breach rings, and role-gated jammer wedges.
 */

import type { Device, ProtocolOut } from "@/types/aeroshield";
import type { Asset } from "@/types/assets";
import type { DeviceStatusEntry } from "@/stores/deviceStatusStore";

/** AS_2.0G-style fallbacks when device/protocol defaults are absent (see old-ui beam.ts). */
export const FALLBACK_DETECTION_BEAM_DEG = 360;
export const FALLBACK_JAMMER_BEAM_DEG = 30;

/** Hard-coded breach radii (m) — matches old-ui `effectiveBreachRings` fallback chain. */
export const FALLBACK_BREACH_GREEN_M = 5000;
export const FALLBACK_BREACH_YELLOW_M = 2500;
export const FALLBACK_BREACH_RED_M = 1000;

function clampDeg(v: number): number {
  if (!Number.isFinite(v)) return 360;
  return Math.max(0, Math.min(360, v));
}

function resolveLayerStatus(
  device: Device,
  live?: DeviceStatusEntry,
): "ACTIVE" | "INACTIVE" {
  const raw = live?.status ?? device.status ?? "OFFLINE";
  const u = String(raw).toUpperCase();
  return u === "ONLINE" || u === "WORKING" || u === "IDLE" ? "ACTIVE" : "INACTIVE";
}

/** Build lookup keyed by protocol `name` (e.g. AS_2.0G). */
export function protocolCatalogMap(
  protocols?: ProtocolOut[],
): Map<string, ProtocolOut> {
  const m = new Map<string, ProtocolOut>();
  if (!protocols?.length) return m;
  for (const p of protocols) {
    m.set(p.name, p);
  }
  return m;
}

function protocolRow(
  protocolName: string | null | undefined,
  pmap: Map<string, ProtocolOut>,
): ProtocolOut | undefined {
  const key =
    protocolName != null && String(protocolName).trim() !== ""
      ? String(protocolName).trim()
      : "AS_2.0G";
  return pmap.get(key);
}

/**
 * Resolve effective breach radii in km — mirrors old-ui `effectiveBreachRings`:
 * device overrides → protocol defaults → numeric fallbacks.
 * Returns null only when green > yellow > red > 0 is violated after resolution.
 */
export function effectiveBreachRingsKm(
  protocolName: string | null | undefined,
  breachGreenM: number | null | undefined,
  breachYellowM: number | null | undefined,
  breachRedM: number | null | undefined,
  pmap: Map<string, ProtocolOut>,
): { greenKm: number; yellowKm: number; redKm: number } | null {
  const protoKey =
    protocolName != null && String(protocolName).trim() !== ""
      ? String(protocolName).trim()
      : "AS_2.0G";
  const pd = pmap.get(protoKey);
  const g = Number(
    breachGreenM ?? pd?.default_breach_green_m ?? FALLBACK_BREACH_GREEN_M,
  );
  const y = Number(
    breachYellowM ?? pd?.default_breach_yellow_m ?? FALLBACK_BREACH_YELLOW_M,
  );
  const r = Number(
    breachRedM ?? pd?.default_breach_red_m ?? FALLBACK_BREACH_RED_M,
  );
  if (![g, y, r].every((x) => Number.isFinite(x))) return null;
  if (!(g > y && y > r && r > 0)) return null;
  return { greenKm: g / 1000, yellowKm: y / 1000, redKm: r / 1000 };
}

/** Strict triple only when all breach_* are present on device/API row (legacy helper). */
export function breachRingsKmFromDevice(
  d: Pick<
    Device,
    "breach_green_m" | "breach_yellow_m" | "breach_red_m"
  >,
): { greenKm: number; yellowKm: number; redKm: number } | null {
  const g = d.breach_green_m;
  const y = d.breach_yellow_m;
  const r = d.breach_red_m;
  if (g == null || y == null || r == null) return null;
  if (!(g > y && y > r && r > 0)) return null;
  return { greenKm: g / 1000, yellowKm: y / 1000, redKm: r / 1000 };
}

export function deviceRoles(deviceType: string | undefined): {
  hasDetection: boolean;
  hasJammer: boolean;
} {
  const role = (deviceType ?? "DETECTION_JAMMER").toUpperCase();
  return {
    hasDetection: role === "DETECTION" || role === "DETECTION_JAMMER",
    hasJammer: role === "JAMMER" || role === "DETECTION_JAMMER",
  };
}

/** Single device → Point feature with all radar layer properties (promoteId: id). */
export function deviceToRadarAssetFeature(
  d: Device,
  liveById: Record<string, DeviceStatusEntry>,
  pmap: Map<string, ProtocolOut> = new Map(),
): GeoJSON.Feature<GeoJSON.Point> {
  const live = liveById[d.id];
  const status = resolveLayerStatus(d, live);
  const { hasDetection, hasJammer } = deviceRoles(d.device_type);
  const pd = protocolRow(d.protocol, pmap);
  const detBeam = clampDeg(
    d.detection_beam_deg ??
      pd?.default_detection_beam_deg ??
      FALLBACK_DETECTION_BEAM_DEG,
  );
  const jamBeam = clampDeg(
    d.jammer_beam_deg ??
      pd?.default_jammer_beam_deg ??
      FALLBACK_JAMMER_BEAM_DEG,
  );
  const breach = effectiveBreachRingsKm(
    d.protocol,
    d.breach_green_m,
    d.breach_yellow_m,
    d.breach_red_m,
    pmap,
  );
  const detKm = hasDetection
    ? d.detection_radius_m != null && d.detection_radius_m > 0
      ? d.detection_radius_m / 1000
      : 2
    : 0;
  const jamKm =
    hasJammer && d.jammer_radius_m != null && d.jammer_radius_m > 0
      ? d.jammer_radius_m / 1000
      : 0;

  return {
    type: "Feature",
    properties: {
      id: d.id,
      name: d.name ?? d.serial_number ?? d.id,
      status,
      coverageRadiusKm: detKm,
      jammerRadiusKm: jamKm,
      device_type: (d.device_type || "DETECTION_JAMMER").toUpperCase(),
      hasDetection: hasDetection ? 1 : 0,
      hasJammer: hasJammer ? 1 : 0,
      detectionBeamDeg: detBeam,
      jammerBeamDeg: jamBeam,
      detectionIsSector: detBeam > 0 && detBeam < 360 ? 1 : 0,
      jammerIsSector: jamBeam > 0 && jamBeam < 360 ? 1 : 0,
      breachGreenKm: breach?.greenKm,
      breachYellowKm: breach?.yellowKm,
      breachRedKm: breach?.redKm,
      protocol: d.protocol ?? "",
    },
    geometry: {
      type: "Point",
      coordinates: [d.longitude, d.latitude],
    },
  };
}

export function devicesToRadarAssetsGeoJSON(
  devices: Device[],
  liveById: Record<string, DeviceStatusEntry>,
  protocols?: ProtocolOut[],
): GeoJSON.FeatureCollection {
  const pmap = protocolCatalogMap(protocols);
  return {
    type: "FeatureCollection",
    features: devices.map((d) =>
      deviceToRadarAssetFeature(d, liveById, pmap),
    ),
  };
}

/** Landing / mock asset — omnidirectional detection; breach uses protocol catalogue + fallbacks only. */
export function assetToDefaultRadarFeature(
  a: Asset,
  pmap: Map<string, ProtocolOut> = new Map(),
): GeoJSON.Feature<GeoJSON.Point> {
  const breach = effectiveBreachRingsKm(
    undefined,
    undefined,
    undefined,
    undefined,
    pmap,
  );
  return {
    type: "Feature",
    properties: {
      id: a.id,
      name: a.name,
      status: a.status,
      coverageRadiusKm: a.coverageRadiusKm,
      jammerRadiusKm: 0,
      device_type: "DETECTION_JAMMER",
      hasDetection: 1,
      hasJammer: 0,
      detectionBeamDeg: FALLBACK_DETECTION_BEAM_DEG,
      jammerBeamDeg: FALLBACK_JAMMER_BEAM_DEG,
      detectionIsSector: 0,
      jammerIsSector: 0,
      breachGreenKm: breach?.greenKm,
      breachYellowKm: breach?.yellowKm,
      breachRedKm: breach?.redKm,
    },
    geometry: {
      type: "Point",
      coordinates: a.coordinates,
    },
  };
}

/** Same merge as assetsForIntercept: landing by id, mission devices overwrite. */
export function buildMergedRadarAssetsGeoJSON(
  landing: Asset[],
  missionDevices: Device[] | undefined,
  liveById: Record<string, DeviceStatusEntry>,
  protocols?: ProtocolOut[],
): GeoJSON.FeatureCollection {
  const pmap = protocolCatalogMap(protocols);
  const byId = new Map<string, GeoJSON.Feature<GeoJSON.Point>>();
  for (const a of landing) {
    byId.set(a.id, assetToDefaultRadarFeature(a, pmap));
  }
  if (missionDevices?.length) {
    for (const d of missionDevices) {
      byId.set(d.id, deviceToRadarAssetFeature(d, liveById, pmap));
    }
  }
  return {
    type: "FeatureCollection",
    features: Array.from(byId.values()),
  };
}

/** Map /map/features device row → radar properties (snake_case from API). */
export function radarPropsFromMapFeatureProps(
  props: Record<string, unknown>,
  coverageRadiusKm: number,
  status: "ACTIVE" | "INACTIVE",
  protocols?: ProtocolOut[],
): Record<string, unknown> {
  const pmap = protocolCatalogMap(protocols);
  const device_type = String(props.device_type ?? "DETECTION_JAMMER").toUpperCase();
  const { hasDetection, hasJammer } = deviceRoles(device_type);
  const proto =
    props.protocol != null ? String(props.protocol) : undefined;
  const pd = protocolRow(proto, pmap);
  const detBeam = clampDeg(
    props.detection_beam_deg != null
      ? Number(props.detection_beam_deg)
      : (pd?.default_detection_beam_deg ?? FALLBACK_DETECTION_BEAM_DEG),
  );
  const jamBeam = clampDeg(
    props.jammer_beam_deg != null
      ? Number(props.jammer_beam_deg)
      : (pd?.default_jammer_beam_deg ?? FALLBACK_JAMMER_BEAM_DEG),
  );
  const jamM = props.jammer_radius_m != null ? Number(props.jammer_radius_m) : 0;

  const breach = effectiveBreachRingsKm(
    proto,
    props.breach_green_m != null ? Number(props.breach_green_m) : undefined,
    props.breach_yellow_m != null ? Number(props.breach_yellow_m) : undefined,
    props.breach_red_m != null ? Number(props.breach_red_m) : undefined,
    pmap,
  );

  return {
    ...props,
    status,
    coverageRadiusKm,
    jammerRadiusKm: Number.isFinite(jamM) ? jamM / 1000 : 0,
    device_type,
    hasDetection: hasDetection ? 1 : 0,
    hasJammer: hasJammer ? 1 : 0,
    detectionBeamDeg: detBeam,
    jammerBeamDeg: jamBeam,
    detectionIsSector: detBeam > 0 && detBeam < 360 ? 1 : 0,
    jammerIsSector: jamBeam > 0 && jamBeam < 360 ? 1 : 0,
    breachGreenKm: breach?.greenKm,
    breachYellowKm: breach?.yellowKm,
    breachRedKm: breach?.redKm,
  };
}
