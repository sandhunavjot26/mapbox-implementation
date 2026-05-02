/**
 * Mission device radar overlays on Mapbox (Task 0).
 *
 * Behaviour matches old-ui `MissionMap` + `beam.ts` (not pixel styling):
 * - Azimuth: `radarAzimuthKinematics` smooths sparse WS samples like old-ui `useRadarKinematics`; D20 uses a FE sweep (no turntable azimuth).
 * - Beam width / range from GeoJSON (device + protocol defaults); omnidirectional detection uses a narrow boresight wedge for cueing.
 * - Breach zones: filled annuli (red stepped disk, yellow/green rings) + green/yellow/red outlines (old-ui semantics).
 * - Detection wedge uses white gradient segments; jammer wedge uses the same structure in amber.
 * - Radar stroke/fill hex values come from `COLOR.mapRadar*` in `src/styles/driifTokens.ts` — adjust there when map-overlay Figma tokens ship.
 */

import mapboxgl from "mapbox-gl";
import type { Asset } from "@/types/assets";
import { useTargetsStore } from "@/stores/targetsStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import type { BasemapVariant } from "@/utils/mapboxBasemapConfig";
import { assetToDefaultRadarFeature } from "@/utils/radarAssetsGeoJSON";
import { COLOR } from "@/styles/driifTokens";
import {
  advanceRadarAzimuthAnimation,
  clearRadarAzimuthKinematics,
  getAnimatedRadarAzimuth,
  syncRadarAzimuthSamples,
} from "@/utils/radarAzimuthKinematics";

export type RadarAnimAsset = {
  id: string;
  coordinates: [number, number];
  coverageRadiusKm: number;
  jammerRadiusKm: number;
  status: string;
  hasDetection: boolean;
  hasJammer: boolean;
  detectionBeamDeg: number;
  jammerBeamDeg: number;
  detectionIsSector: boolean;
  jammerIsSector: boolean;
  breachGreenKm?: number;
  breachYellowKm?: number;
  breachRedKm?: number;
  /** Device protocol (e.g. D20) — used for wedge behaviour parity with old-ui. */
  protocol?: string;
};

/** Updated by setAssetLayersData — rAF reads `useDeviceStatusStore` each frame for azimuth. */
let currentAssetsForAnimation: RadarAnimAsset[] = [];

const EARTH_RADIUS_KM = 6371;

/** Animation frame ID for cancellation on map destroy */
let requestAnimationId: number | null = null;

/** Figma Driif-UI map symbology — colours from `COLOR.mapRadar*` in driifTokens */
const RADAR_SLOT = "top" as const;

/** Shared dash for decorative range rings + draped detection coverage outline */
const RADAR_RING_DASH = [4, 3] as const;

/** When API beam is omnidirectional (360°), still draw a narrow white wedge from live azimuth. */
const DETECTION_BORESIGHT_BEAM_DEG = 40;

/** D20 spectrum radars: old-ui FE sweep when no turntable azimuth (~6 s per revolution). */
const D20_SWEEP_DPS = 60;

function d20SyntheticAzimuth(deviceId: string): number {
  let h = 5381;
  for (let i = 0; i < deviceId.length; i++) {
    h = ((h << 5) + h + deviceId.charCodeAt(i)) >>> 0;
  }
  const phase = h % 360;
  const t = performance.now() / 1000;
  return ((phase + t * D20_SWEEP_DPS) % 360 + 360) % 360;
}

/** Breach zone fills — stepped annuli use COLOR.mapRadarBreach* */
const BREACH_RED_CORE_BANDS: { inner: number; outer: number; op: number }[] = [
  { inner: 0.02, outer: 0.28, op: 0.5 },
  { inner: 0.28, outer: 0.52, op: 0.3 },
  { inner: 0.52, outer: 0.76, op: 0.16 },
  { inner: 0.76, outer: 1.0, op: 0.08 },
];

/** GeoJSON source id — mirror `feature-state` here from `assets` for selection styling */
export const ASSETS_COVERAGE_DRAPE_SOURCE = "assets-coverage-drape";

let currentBasemapVariant: BasemapVariant = "standard";

export function setAssetBasemapVariant(variant: BasemapVariant): void {
  currentBasemapVariant = variant;
}

let cachedAssetTowerImage: HTMLImageElement | ImageBitmap | ImageData | null =
  null;

/** Decoded tower PNG for reuse after setStyle (no re-fetch). */
export function getCachedAssetTowerImage():
  | HTMLImageElement
  | ImageBitmap
  | ImageData
  | null {
  return cachedAssetTowerImage;
}

// Compute destination point from [lng, lat], bearing (degrees), distance (km)
function destinationPoint(
  center: [number, number],
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const [lng, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const d = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(bearingRad),
  );
  const lng2 =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(lat2),
    );

  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

// Haversine distance in km
function distanceKm(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * One annular slice of a sector (ring sector between two radii), geodesic.
 * `beamDeg` is full beam width; `bearingDeg` is sector centre bearing.
 */
function generateRadarSweepSegment(
  center: [number, number],
  bearingDeg: number,
  radiusInnerKm: number,
  radiusOuterKm: number,
  beamDeg: number,
  steps = 8,
): GeoJSON.Position[] {
  if (radiusOuterKm <= 0 || beamDeg <= 0) return [];
  const half = beamDeg / 2;
  const start = bearingDeg - half;
  const end = bearingDeg + half;
  const points: GeoJSON.Position[] = [center];
  points.push(destinationPoint(center, start, radiusInnerKm));
  points.push(destinationPoint(center, start, radiusOuterKm));
  for (let i = 1; i <= steps; i++) {
    const angle = start + (i / steps) * (end - start);
    points.push(destinationPoint(center, angle, radiusOuterKm));
  }
  points.push(destinationPoint(center, end, radiusInnerKm));
  points.push(center);
  return points;
}

/** Jammer wedge — stronger opacity near inner radius (amber fill from layer paint). */
function gradientSectorSegmentsJammer(
  center: [number, number],
  azimuthDeg: number,
  radiusKm: number,
  beamDeg: number,
): Array<{ coords: GeoJSON.Position[]; opacity: number }> {
  const bands = [
    { r0: 0.02, r1: 0.25, opacity: 0.48 },
    { r0: 0.25, r1: 0.5, opacity: 0.32 },
    { r0: 0.5, r1: 0.75, opacity: 0.2 },
    { r0: 0.75, r1: 1, opacity: 0.12 },
  ];
  return bands.map(({ r0, r1, opacity }) => ({
    coords: generateRadarSweepSegment(
      center,
      azimuthDeg,
      radiusKm * r0,
      radiusKm * r1,
      beamDeg,
    ),
    opacity,
  }));
}

/** Detection wedge — white; opacity strengthens toward outer arc (screenshot). */
function gradientSectorSegmentsDetectionWhite(
  center: [number, number],
  azimuthDeg: number,
  radiusKm: number,
  beamDeg: number,
): Array<{ coords: GeoJSON.Position[]; opacity: number }> {
  const bands = [
    { r0: 0.02, r1: 0.25, opacity: 0.10 },
    { r0: 0.25, r1: 0.5, opacity: 0.20 },
    { r0: 0.5, r1: 0.75, opacity: 0.33 },
    { r0: 0.75, r1: 1, opacity: 0.49 },
  ];
  return bands.map(({ r0, r1, opacity }) => ({
    coords: generateRadarSweepSegment(
      center,
      azimuthDeg,
      radiusKm * r0,
      radiusKm * r1,
      beamDeg,
    ),
    opacity,
  }));
}

function normalizeAzimuth(deg: number | undefined): number {
  if (deg == null || !Number.isFinite(deg)) return 0;
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

function resolveSweepAzimuth(
  asset: RadarAnimAsset,
  liveById: Record<string, { azimuth_deg?: number } | undefined>,
): { azDeg: number; ok: boolean } {
  const proto = (asset.protocol ?? "").toUpperCase();
  if (proto === "D20") {
    return { azDeg: d20SyntheticAzimuth(asset.id), ok: true };
  }
  const rawAz = liveById[asset.id]?.azimuth_deg;
  const hasLiveAzimuth =
    rawAz != null && Number.isFinite(Number(rawAz));
  if (!hasLiveAzimuth) return { azDeg: 0, ok: false };
  const smoothed = getAnimatedRadarAzimuth(asset.id);
  const azDeg =
    smoothed != null ? smoothed : normalizeAzimuth(Number(rawAz));
  return { azDeg, ok: true };
}

function parseRadarAnimAsset(f: GeoJSON.Feature): RadarAnimAsset | null {
  const geom = f.geometry as GeoJSON.Point | undefined;
  const coords = geom?.coordinates;
  if (!coords || coords.length < 2) return null;
  const p = f.properties ?? {};
  const id = String(p.id ?? "");
  if (!id) return null;
  const hasDetection = Number(p.hasDetection) === 1;
  const hasJammer = Number(p.hasJammer) === 1;
  return {
    id,
    coordinates: [coords[0], coords[1]],
    coverageRadiusKm: Number(p.coverageRadiusKm) || 2,
    jammerRadiusKm: Number(p.jammerRadiusKm) || 0,
    status: String(p.status ?? "INACTIVE"),
    hasDetection,
    hasJammer,
    detectionBeamDeg: Number(p.detectionBeamDeg) || 360,
    jammerBeamDeg: Number(p.jammerBeamDeg) || 30,
    detectionIsSector: Number(p.detectionIsSector) === 1,
    jammerIsSector: Number(p.jammerIsSector) === 1,
    breachGreenKm:
      p.breachGreenKm != null ? Number(p.breachGreenKm) : undefined,
    breachYellowKm:
      p.breachYellowKm != null ? Number(p.breachYellowKm) : undefined,
    breachRedKm: p.breachRedKm != null ? Number(p.breachRedKm) : undefined,
    protocol:
      p.protocol != null && String(p.protocol).trim() !== ""
        ? String(p.protocol)
        : undefined,
  };
}

// Generate pulsing ring polygon (approximate circle)
function generateRing(
  center: [number, number],
  radiusKm: number,
  steps = 16, // reduced from 24 for performance
): GeoJSON.Position[] {
  const points: GeoJSON.Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 360;
    points.push(destinationPoint(center, angle, radiusKm));
  }
  return points;
}

function generateRingBand(
  center: [number, number],
  innerRadiusKm: number,
  outerRadiusKm: number,
  steps = 16,
): GeoJSON.Position[] {
  const outer = generateRing(center, outerRadiusKm, steps);
  const inner = generateRing(center, innerRadiusKm, steps).reverse();
  return [...outer, outer[0], ...inner, inner[0]];
}

// Load tower icon into map (decode once, reuse across setStyle)
async function loadAssetIcon(map: mapboxgl.Map): Promise<void> {
  if (map.hasImage("asset-tower")) return;
  if (cachedAssetTowerImage) {
    map.addImage("asset-tower", cachedAssetTowerImage);
    return;
  }
  return new Promise((resolve) => {
    map.loadImage("/icons/tower.png", (err, image) => {
      if (!err && image) {
        cachedAssetTowerImage = image;
        if (!map.hasImage("asset-tower")) {
          map.addImage("asset-tower", image);
        }
      }
      resolve();
    });
  });
}

/** Mock / landing assets → GeoJSON (omnidirectional detection defaults). */
export function assetsToGeoJSON(assets: Asset[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: assets.map((a) => assetToDefaultRadarFeature(a)),
  };
}

/** Update assets source from API GeoJSON (devices with radar Task 0 properties) */
export function setAssetLayersData(
  map: mapboxgl.Map,
  geoJSON: GeoJSON.FeatureCollection,
): void {
  const source = map.getSource("assets") as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geoJSON);
    currentAssetsForAnimation = geoJSON.features
      .map(parseRadarAnimAsset)
      .filter((x): x is RadarAnimAsset => x != null);
  }
}

// Add asset layers to map
export async function addAssetLayers(
  map: mapboxgl.Map,
  initialData?: GeoJSON.FeatureCollection,
  opts?: { basemapVariant?: BasemapVariant },
): Promise<void> {
  if (opts?.basemapVariant) {
    currentBasemapVariant = opts.basemapVariant;
  }
  if (map.getSource("assets")) return;

  await loadAssetIcon(map);

  const data = initialData ?? {
    type: "FeatureCollection" as const,
    features: [],
  };
  if (initialData) {
    currentAssetsForAnimation = initialData.features
      .map(parseRadarAnimAsset)
      .filter((x): x is RadarAnimAsset => x != null);
  }

  map.addSource("assets", {
    type: "geojson",
    data,
    promoteId: "id",
  });

  map.addSource(ASSETS_COVERAGE_DRAPE_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    promoteId: "id",
  });

  // Layer 1: Detection coverage — draped polygon + dashed outline (terrain-safe vs circle layer)
  map.addLayer({
    id: "assets-coverage-fill",
    type: "fill",
    source: ASSETS_COVERAGE_DRAPE_SOURCE,
    slot: RADAR_SLOT,
    paint: {
      "fill-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        COLOR.mapRadarCoverageActiveFill,
        COLOR.mapRadarCoverageInactiveFill,
      ],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.42,
        0.3,
      ],
      "fill-emissive-strength": 1,
      "fill-color-use-theme": "disabled",
    },
  });
  map.addLayer({
    id: "assets-coverage-outline",
    type: "line",
    source: ASSETS_COVERAGE_DRAPE_SOURCE,
    slot: RADAR_SLOT,
    paint: {
      "line-color": COLOR.mapRadarRingOrangeDeep,
      "line-width": [
        "case",
        ["==", ["get", "variant"], "satellite"],
        2.6,
        2.0,
      ],
      "line-dasharray": ["literal", [...RADAR_RING_DASH]],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.95,
        0.88,
      ],
      "line-emissive-strength": 1,
      "line-color-use-theme": "disabled",
    },
  });

  if (!map.getSource("breach-threat-rings")) {
    map.addSource("breach-threat-rings", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  // Layer 2: Filled warm radar bands
  if (!map.getSource("radar-band-fills")) {
    map.addSource("radar-band-fills", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  map.addLayer({
    id: "radar-band-fills-layer",
    type: "fill",
    source: "radar-band-fills",
    slot: RADAR_SLOT,
    paint: {
      "fill-color": ["get", "fillColor"],
      "fill-opacity": [
        "*",
        ["get", "fillOpacity"],
        ["get", "statusDim"],
        ["get", "decorDim"],
      ],
      "fill-emissive-strength": 1,
      "fill-color-use-theme": "disabled",
    },
  });

  // Layer 3: Concentric dashed range rings
  if (!map.getSource("radar-rings")) {
    map.addSource("radar-rings", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  map.addLayer({
    id: "radar-rings-halo-layer",
    type: "line",
    source: "radar-rings",
    slot: RADAR_SLOT,
    paint: {
      "line-color": COLOR.mapRadarRingHaloLine,
      "line-width": ["match", ["get", "ringTier"], 2, 4.2, 3.8],
      "line-blur": 1.5,
      "line-opacity": [
        "*",
        ["case", ["==", ["get", "variant"], "satellite"], 0.7, 0.35],
        ["get", "statusDim"],
      ],
      "line-color-use-theme": "disabled",
    },
  });
  map.addLayer({
    id: "radar-rings-layer",
    type: "line",
    source: "radar-rings",
    slot: RADAR_SLOT,
    paint: {
      "line-color": [
        "match",
        ["get", "ringTier"],
        2,
        COLOR.mapRadarRingOrangeDeep,
        COLOR.mapRadarRingOrange,
      ],
      "line-width": [
        "match",
        ["get", "ringTier"],
        2,
        ["case", ["==", ["get", "variant"], "satellite"], 2.6, 2.0],
        ["case", ["==", ["get", "variant"], "satellite"], 2.1, 1.6],
      ],
      "line-dasharray": ["literal", [...RADAR_RING_DASH]],
      "line-opacity": [
        "*",
        ["case", ["==", ["get", "variant"], "satellite"], 1.0, 0.92],
        ["get", "statusDim"],
      ],
      "line-emissive-strength": 1,
      "line-color-use-theme": "disabled",
    },
  });

  if (!map.getSource("breach-threat-fills")) {
    map.addSource("breach-threat-fills", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  map.addLayer({
    id: "breach-threat-fills-layer",
    type: "fill",
    source: "breach-threat-fills",
    slot: RADAR_SLOT,
    paint: {
      "fill-color": ["get", "fillColor"],
      "fill-opacity": ["*", ["get", "fillOpacity"], ["get", "statusDim"]],
      "fill-emissive-strength": 1,
      "fill-color-use-theme": "disabled",
    },
  });

  // Breach threat rings — after band fills + decorative rings so strokes are not painted over.
  // (Data still comes from device breach_*_m via `deviceToRadarAssetFeature`.)
  const breachPaint = {
    green: {
      color: COLOR.mapRadarBreachGreenStroke,
      width: 1,
      dash: [4, 4] as [number, number],
    },
    yellow: {
      color: COLOR.mapRadarBreachYellowStroke,
      width: 1.2,
      dash: [6, 4] as [number, number],
    },
    red: {
      color: COLOR.mapRadarBreachRedStroke,
      width: 1.6,
      dash: [5, 4] as [number, number],
    },
  } as const;
  (["green", "yellow", "red"] as const).forEach((tier) => {
    const spec = breachPaint[tier];
    const paint: mapboxgl.LineLayer["paint"] = {
      "line-color": spec.color,
      "line-width": spec.width,
      "line-opacity": 0.88,
      "line-emissive-strength": 1,
      "line-color-use-theme": "disabled",
    };
    if (tier === "green") {
      paint["line-dasharray"] = ["literal", breachPaint.green.dash];
    } else if (tier === "yellow") {
      paint["line-dasharray"] = ["literal", breachPaint.yellow.dash];
    } else {
      paint["line-dasharray"] = ["literal", breachPaint.red.dash];
    }
    map.addLayer({
      id: `breach-ring-${tier}`,
      type: "line",
      source: "breach-threat-rings",
      slot: RADAR_SLOT,
      filter: ["==", ["get", "tier"], tier],
      paint,
    });
  });

  // Layer 4: Gradient radar sweep (directional wedges on top of breach rings)
  if (!map.getSource("radar-sweep")) {
    map.addSource("radar-sweep", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  const radarSweepPaint: mapboxgl.FillLayer["paint"] = {
    "fill-color": [
      "match",
      ["get", "sweepKind"],
      "jammer",
      COLOR.mapRadarSweepJammerWedge,
      COLOR.mapRadarSweepDetectionWedge,
    ],
    "fill-opacity": ["get", "opacity"],
    "fill-emissive-strength": 1,
    "fill-color-use-theme": "disabled",
  };
  map.addLayer({
    id: "radar-sweep-detection",
    type: "fill",
    source: "radar-sweep",
    slot: RADAR_SLOT,
    filter: ["==", ["get", "sweepKind"], "detection"],
    paint: radarSweepPaint,
  });
  map.addLayer({
    id: "radar-sweep-jammer",
    type: "fill",
    source: "radar-sweep",
    slot: RADAR_SLOT,
    filter: ["==", ["get", "sweepKind"], "jammer"],
    paint: radarSweepPaint,
  });

  // Layer 5: Lock-on indicators (when target in coverage)
  if (!map.getSource("radar-lockon")) {
    map.addSource("radar-lockon", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  map.addLayer({
    id: "radar-lockon-layer",
    type: "circle",
    source: "radar-lockon",
    slot: RADAR_SLOT,
    paint: {
      "circle-radius": 12,
      "circle-color": COLOR.mapRadarLockOnCore,
      "circle-opacity": 0.88,
      "circle-stroke-width": 2,
      "circle-stroke-color": COLOR.mapRadarLockOnStroke,
      "circle-emissive-strength": 1,
      "circle-color-use-theme": "disabled",
      "circle-stroke-color-use-theme": "disabled",
    },
  });

  // Layer 6: Tower symbols
  map.addLayer({
    id: "assets-symbols",
    type: "symbol",
    source: "assets",
    slot: RADAR_SLOT,
    layout: {
      "icon-image": "asset-tower",
      "icon-size": 0.22,
      "icon-allow-overlap": true,
    },
    paint: {
      "icon-emissive-strength": 1,
    },
  });

  let lastAnimateTime = 0;
  let lastKinMs = performance.now();
  const FRAME_INTERVAL = 33; // ~30fps throttle (ms)

  function animate(now: number) {
    requestAnimationId = requestAnimationFrame(animate);

    const kinDt = Math.min((now - lastKinMs) / 1000, 0.25);
    lastKinMs = now;

    const assets = currentAssetsForAnimation;
    const liveById = useDeviceStatusStore.getState().byDeviceId;
    syncRadarAzimuthSamples(assets, liveById, now);
    advanceRadarAzimuthAnimation(kinDt);

    if (now - lastAnimateTime < FRAME_INTERVAL) return;
    lastAnimateTime = now;

    const isSat = currentBasemapVariant === "standard-satellite";
    const variant = isSat ? "satellite" : "standard";

    const sweepFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    assets.forEach((asset) => {
      const { azDeg: az, ok: hasSweepAzimuth } = resolveSweepAzimuth(
        asset,
        liveById,
      );
      const detSlices: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
      const jamSlices: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
      if (
        hasSweepAzimuth &&
        asset.hasDetection &&
        asset.coverageRadiusKm > 0
      ) {
        const wedgeBeamDeg = asset.detectionIsSector
          ? asset.detectionBeamDeg
          : DETECTION_BORESIGHT_BEAM_DEG;
        gradientSectorSegmentsDetectionWhite(
          asset.coordinates,
          az,
          asset.coverageRadiusKm,
          wedgeBeamDeg,
        ).forEach(({ coords, opacity }) => {
          if (coords.length < 4) return;
          detSlices.push({
            type: "Feature",
            properties: { opacity, sweepKind: "detection" },
            geometry: { type: "Polygon", coordinates: [coords] },
          });
        });
      }
      if (
        hasSweepAzimuth &&
        asset.hasJammer &&
        asset.jammerRadiusKm > 0 &&
        asset.jammerIsSector
      ) {
        gradientSectorSegmentsJammer(
          asset.coordinates,
          az,
          asset.jammerRadiusKm,
          asset.jammerBeamDeg,
        ).forEach(({ coords, opacity }) => {
          if (coords.length < 4) return;
          jamSlices.push({
            type: "Feature",
            properties: {
              opacity: opacity * 0.55,
              sweepKind: "jammer",
            },
            geometry: { type: "Polygon", coordinates: [coords] },
          });
        });
      }
      // Jammer first, then detection — white wedge reads on top of amber jammer.
      sweepFeatures.push(...jamSlices, ...detSlices);
    });

    const coverageFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    assets.forEach((asset) => {
      const r = asset.coverageRadiusKm;
      if (!(r > 0)) return;
      const ring = generateRing(asset.coordinates, r);
      const closed: GeoJSON.Position[] = [...ring, ring[0] as GeoJSON.Position];
      coverageFeatures.push({
        type: "Feature",
        properties: {
          id: asset.id,
          status: asset.status,
          variant,
        },
        geometry: { type: "Polygon", coordinates: [closed] },
      });
    });

    const breachFillFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

    const breachLineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    assets.forEach((asset) => {
      const g = asset.breachGreenKm;
      const y = asset.breachYellowKm;
      const r = asset.breachRedKm;
      if (g == null || y == null || r == null) return;
      if (!(g > y && y > r && r > 0)) return;
      const statusDim = asset.status === "ACTIVE" ? 1 : 0.38;
      for (const b of BREACH_RED_CORE_BANDS) {
        const innerR = r * b.inner;
        const outerR = r * b.outer;
        if (!(outerR > innerR)) continue;
        breachFillFeatures.push({
          type: "Feature",
          properties: {
            fillColor: COLOR.mapRadarBreachRedFillCore,
            fillOpacity: b.op,
            statusDim,
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              generateRingBand(asset.coordinates, innerR, outerR),
            ],
          },
        });
      }
      breachFillFeatures.push(
        {
          type: "Feature",
          properties: {
            fillColor: COLOR.mapRadarBreachYellowZoneFill,
            fillOpacity: 1,
            statusDim,
          },
          geometry: {
            type: "Polygon",
            coordinates: [generateRingBand(asset.coordinates, r, y)],
          },
        },
        {
          type: "Feature",
          properties: {
            fillColor: COLOR.mapRadarBreachGreenZoneFill,
            fillOpacity: 1,
            statusDim,
          },
          geometry: {
            type: "Polygon",
            coordinates: [generateRingBand(asset.coordinates, y, g)],
          },
        },
      );
      (
        [
          { tier: "green" as const, radiusKm: g },
          { tier: "yellow" as const, radiusKm: y },
          { tier: "red" as const, radiusKm: r },
        ] as const
      ).forEach(({ tier, radiusKm }) => {
        const ring = generateRing(asset.coordinates, radiusKm);
        const closed = [...ring, ring[0]];
        breachLineFeatures.push({
          type: "Feature",
          properties: { tier, deviceId: asset.id },
          geometry: { type: "LineString", coordinates: closed },
        });
      });
    });

    const ringFillFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    const ringFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const yellowFill = isSat
      ? COLOR.mapRadarWarmYellowFillSatellite
      : COLOR.mapRadarWarmYellowFill;
    const orangeFill = isSat
      ? COLOR.mapRadarWarmOrangeFillSatellite
      : COLOR.mapRadarWarmOrangeFill;

    assets.forEach((asset) => {
      const statusDim = asset.status === "ACTIVE" ? 1 : 0.38;
      const bg = asset.breachGreenKm;
      const by = asset.breachYellowKm;
      const br = asset.breachRedKm;
      const hasBreach =
        bg != null &&
        by != null &&
        br != null &&
        bg > by &&
        by > br &&
        br > 0;
      const decorDim = hasBreach ? 0.58 : 1;
      const ringKm =
        asset.hasDetection && asset.coverageRadiusKm > 0
          ? asset.coverageRadiusKm
          : asset.hasJammer && asset.jammerRadiusKm > 0
            ? asset.jammerRadiusKm
            : asset.coverageRadiusKm;
      if (ringKm <= 0) return;
      (
        [
          {
            // innerRatio 0 collapses the inner ring to a point → Mapbox draws radial spokes (north spike).
            innerRatio: 0.02,
            outerRatio: 0.5,
            ringTier: 1,
            fillColor: yellowFill,
            fillOpacity: 1,
          },
          {
            innerRatio: 0.5,
            outerRatio: 1,
            ringTier: 2,
            fillColor: orangeFill,
            fillOpacity: 1,
          },
        ] as const
      ).forEach(
        ({ innerRatio, outerRatio, ringTier, fillColor, fillOpacity }) => {
          ringFillFeatures.push({
            type: "Feature",
            properties: { fillColor, fillOpacity, statusDim, decorDim },
            geometry: {
              type: "Polygon",
              coordinates: [
                generateRingBand(
                  asset.coordinates,
                  ringKm * innerRatio,
                  ringKm * outerRatio,
                ),
              ],
            },
          });

          const ring = generateRing(asset.coordinates, ringKm * outerRatio);
          ring.push(ring[0]);
          ringFeatures.push({
            type: "Feature",
            properties: { ringTier, statusDim, variant, decorDim },
            geometry: { type: "LineString", coordinates: ring },
          });
        },
      );
    });

    const targets = useTargetsStore.getState().targets;
    const lockedAssets = assets.filter((asset) => {
      const detR = asset.coverageRadiusKm;
      const jamR = asset.jammerRadiusKm;
      const useR =
        asset.hasDetection && detR > 0
          ? detR
          : asset.hasJammer && jamR > 0
            ? jamR
            : detR;
      return targets.some(
        (target) => distanceKm(asset.coordinates, target.coordinates) <= useR,
      );
    });
    const lockonFeatures: GeoJSON.Feature<GeoJSON.Point>[] = lockedAssets.map(
      (asset) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Point" as const,
          coordinates: asset.coordinates,
        },
      }),
    );

    try {
      const coverageDrapeSource = map.getSource(ASSETS_COVERAGE_DRAPE_SOURCE) as
        | mapboxgl.GeoJSONSource
        | undefined;
      const breachSource = map.getSource("breach-threat-rings") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const breachFillSource = map.getSource("breach-threat-fills") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const sweepSource = map.getSource("radar-sweep") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const ringFillSource = map.getSource("radar-band-fills") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const ringsSource = map.getSource("radar-rings") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const lockonSource = map.getSource("radar-lockon") as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (coverageDrapeSource) {
        coverageDrapeSource.setData({
          type: "FeatureCollection",
          features: coverageFeatures,
        });
      }
      if (breachFillSource) {
        breachFillSource.setData({
          type: "FeatureCollection",
          features: breachFillFeatures,
        });
      }
      if (breachSource) {
        breachSource.setData({
          type: "FeatureCollection",
          features: breachLineFeatures,
        });
      }
      if (sweepSource) {
        sweepSource.setData({
          type: "FeatureCollection",
          features: sweepFeatures,
        });
      }
      if (ringFillSource) {
        ringFillSource.setData({
          type: "FeatureCollection",
          features: ringFillFeatures,
        });
      }
      if (ringsSource) {
        ringsSource.setData({
          type: "FeatureCollection",
          features: ringFeatures,
        });
      }
      if (lockonSource) {
        lockonSource.setData({
          type: "FeatureCollection",
          features: lockonFeatures,
        });
      }
    } catch {
      // Map destroyed or sources removed — stop animation
      return;
    }
  }

  requestAnimationId = requestAnimationFrame(animate);
}

/** Cancel the asset animation loop to prevent memory leaks on map re-creation */
export function stopAssetAnimation(): void {
  if (requestAnimationId !== null) {
    cancelAnimationFrame(requestAnimationId);
    requestAnimationId = null;
  }
  clearRadarAzimuthKinematics();
}
