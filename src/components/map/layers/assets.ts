import mapboxgl from "mapbox-gl";
import type { Asset } from "@/types/assets";
import { useTargetsStore } from "@/stores/targetsStore";

/** Current assets for animation — updated by setAssetLayersData when using API */
let currentAssetsForAnimation: Array<{
  id: string;
  coordinates: [number, number];
  coverageRadiusKm: number;
  status: string;
}> = [];

const EARTH_RADIUS_KM = 6371;

/** Animation frame ID for cancellation on map destroy */
let requestAnimationId: number | null = null;

// Sweep speed: ACTIVE = fast, INACTIVE = slow
const SWEEP_SPEED = { ACTIVE: 2, INACTIVE: 0.5 } as const;

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

// Generate gradient sweep segment (inner radius to outer radius)
function generateRadarSweepSegment(
  center: [number, number],
  bearing: number,
  radiusInner: number,
  radiusOuter: number,
  arcAngle = 40,
): GeoJSON.Position[] {
  const steps = 8; // reduced from 16 for performance
  const start = bearing - arcAngle / 2;
  const end = bearing + arcAngle / 2;

  const points: GeoJSON.Position[] = [center];
  points.push(destinationPoint(center, start, radiusInner));
  points.push(destinationPoint(center, start, radiusOuter));

  for (let i = 1; i <= steps; i++) {
    const angle = start + (i / steps) * (end - start);
    points.push(destinationPoint(center, angle, radiusOuter));
  }

  points.push(destinationPoint(center, end, radiusInner));
  points.push(center);
  return points;
}

// Generate gradient radar sweep: 4 concentric segments with opacity falloff
function generateGradientRadarSweep(
  center: [number, number],
  bearing: number,
  radiusKm: number,
  arcAngle = 40,
): Array<{ coords: GeoJSON.Position[]; opacity: number }> {
  const segments = [
    { r0: 0.02, r1: 0.25, opacity: 0.4 },
    { r0: 0.25, r1: 0.5, opacity: 0.25 },
    { r0: 0.5, r1: 0.75, opacity: 0.15 },
    { r0: 0.75, r1: 1, opacity: 0.08 },
  ];
  return segments.map(({ r0, r1, opacity }) => ({
    coords: generateRadarSweepSegment(
      center,
      bearing,
      radiusKm * r0,
      radiusKm * r1,
      arcAngle,
    ),
    opacity,
  }));
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

// Load tower icon into map
async function loadAssetIcon(map: mapboxgl.Map): Promise<void> {
  return new Promise((resolve) => {
    if (map.hasImage("asset-tower")) {
      resolve();
      return;
    }

    map.loadImage("/icons/tower.png", (err, image) => {
      if (!err && image) {
        map.addImage("asset-tower", image);
      }
      resolve();
    });
  });
}

// Convert assets to GeoJSON FeatureCollection
export function assetsToGeoJSON(assets: Asset[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: assets.map((asset) => ({
      type: "Feature" as const,
      properties: {
        id: asset.id,
        name: asset.name,
        status: asset.status,
        altitude: asset.altitude,
        area: asset.area,
        coverageRadiusKm: asset.coverageRadiusKm,
      },
      geometry: {
        type: "Point" as const,
        coordinates: asset.coordinates,
      },
    })),
  };
}

/** Update assets source from API GeoJSON (devices with coverageRadiusKm) */
export function setAssetLayersData(
  map: mapboxgl.Map,
  geoJSON: GeoJSON.FeatureCollection,
): void {
  const source = map.getSource("assets") as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geoJSON);
    currentAssetsForAnimation = geoJSON.features.map((f) => {
      const coords = (f.geometry as GeoJSON.Point)?.coordinates ?? [0, 0];
      const p = f.properties ?? {};
      return {
        id: String(p.id ?? ""),
        coordinates: [coords[0], coords[1]],
        coverageRadiusKm: Number(p.coverageRadiusKm) || 2,
        status: String(p.status ?? "INACTIVE"),
      };
    });
  }
}

// Add asset layers to map
export async function addAssetLayers(
  map: mapboxgl.Map,
  initialData?: GeoJSON.FeatureCollection,
): Promise<void> {
  if (map.getSource("assets")) return;

  await loadAssetIcon(map);

  const data = initialData ?? {
    type: "FeatureCollection" as const,
    features: [],
  };
  if (initialData) {
    currentAssetsForAnimation = initialData.features.map((f) => {
      const coords = (f.geometry as GeoJSON.Point)?.coordinates ?? [0, 0];
      const p = f.properties ?? {};
      return {
        id: String(p.id ?? ""),
        coordinates: [coords[0], coords[1]],
        coverageRadiusKm: Number(p.coverageRadiusKm) || 2,
        status: String(p.status ?? "INACTIVE"),
      };
    });
  }

  map.addSource("assets", {
    type: "geojson",
    data,
    promoteId: "id",
  });

  // Layer 1: Coverage area (radar-style circles)
  map.addLayer({
    id: "assets-coverage",
    type: "circle",
    source: "assets",
    paint: {
      "circle-radius": [
        "interpolate",
        ["exponential", 2],
        ["zoom"],
        5,
        ["*", ["get", "coverageRadiusKm"], 0.3],
        10,
        ["*", ["get", "coverageRadiusKm"], 3],
        15,
        ["*", ["get", "coverageRadiusKm"], 100],
        20,
        ["*", ["get", "coverageRadiusKm"], 3000],
      ],
      "circle-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e",
        "#64748b",
      ],
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.35,
        0.15,
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        2,
        1,
      ],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e",
        "#64748b",
      ],
      "circle-stroke-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.8,
        0.4,
      ],
    },
  });

  // Layer 2: Pulsing concentric rings (line outlines)
  if (!map.getSource("radar-rings")) {
    map.addSource("radar-rings", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  map.addLayer({
    id: "radar-rings-layer",
    type: "line",
    source: "radar-rings",
    paint: {
      "line-color": "#22c55e",
      "line-width": 1.5,
      "line-opacity": ["get", "pulsePhase"],
    },
  });

  // Layer 3: Gradient radar sweep
  if (!map.getSource("radar-sweep")) {
    map.addSource("radar-sweep", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  map.addLayer({
    id: "radar-sweep-layer",
    type: "fill",
    source: "radar-sweep",
    paint: {
      "fill-color": "#22c55e",
      "fill-opacity": ["get", "opacity"],
    },
  });

  // Layer 4: Lock-on indicators (when target in coverage)
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
    paint: {
      "circle-radius": 12,
      "circle-color": "#ef4444",
      "circle-opacity": ["get", "lockPhase"],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Layer 5: Tower symbols
  map.addLayer({
    id: "assets-symbols",
    type: "symbol",
    source: "assets",
    layout: {
      "icon-image": "asset-tower",
      "icon-size": 0.2,
      "icon-allow-overlap": true,
    },
  });

  // Per-asset sweep angles (speed based on status)
  const sweepAngles = new Map<string, number>();

  let pulsePhase = 0;
  let lockPhase = 0;
  let frameCount = 0;
  let lastAnimateTime = 0;
  const FRAME_INTERVAL = 33; // ~30fps throttle (ms)
  const LOCKON_INTERVAL = 30; // recompute lock-on every ~30 frames (~1s)

  // Cached lock-on features to avoid recalculating every frame
  let cachedLockonFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

  function animate(now: number) {
    // Throttle to ~30fps
    if (now - lastAnimateTime < FRAME_INTERVAL) {
      requestAnimationId = requestAnimationFrame(animate);
      return;
    }
    lastAnimateTime = now;
    frameCount++;

    const t = now / 1000;

    pulsePhase = 0.5 + 0.4 * Math.sin(t * 4);
    lockPhase = 0.5 + 0.5 * Math.sin(t * 3);

    const assets = currentAssetsForAnimation;
    // Update per-asset sweep angles
    assets.forEach((asset) => {
      const current = sweepAngles.get(asset.id) ?? 0;
      const speed =
        SWEEP_SPEED[asset.status as keyof typeof SWEEP_SPEED] ??
        SWEEP_SPEED.INACTIVE;
      let next = current + speed;
      if (next > 360) next = 0;
      if (next < 0) next = 360;
      sweepAngles.set(asset.id, next);
    });

    // Gradient sweep features (multiple segments per asset)
    const sweepFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    assets.forEach((asset) => {
      const bearing = sweepAngles.get(asset.id) ?? 0;
      const segments = generateGradientRadarSweep(
        asset.coordinates,
        bearing,
        asset.coverageRadiusKm,
      );
      segments.forEach(({ coords, opacity }) => {
        sweepFeatures.push({
          type: "Feature",
          properties: { opacity },
          geometry: { type: "Polygon", coordinates: [coords] },
        });
      });
    });

    // Pulsing rings (3 per asset at 33%, 66%, 100%)
    const ringFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    assets.forEach((asset) => {
      [0.33, 0.66, 1].forEach((ratio) => {
        const ring = generateRing(
          asset.coordinates,
          asset.coverageRadiusKm * ratio,
        );
        ring.push(ring[0]); // close the ring
        ringFeatures.push({
          type: "Feature",
          properties: { pulsePhase },
          geometry: { type: "LineString", coordinates: ring },
        });
      });
    });

    // Lock-on: only recompute every ~1 second instead of every frame
    if (frameCount % LOCKON_INTERVAL === 0) {
      const targets = useTargetsStore.getState().targets;
      const lockedAssets = assets.filter((asset) =>
        targets.some(
          (target) =>
            distanceKm(asset.coordinates, target.coordinates) <=
            asset.coverageRadiusKm,
        ),
      );
      cachedLockonFeatures = lockedAssets.map((asset) => ({
        type: "Feature" as const,
        properties: { lockPhase },
        geometry: {
          type: "Point" as const,
          coordinates: asset.coordinates,
        },
      }));
    } else {
      // Update only the lockPhase property without recomputing geometry
      cachedLockonFeatures.forEach((f) => {
        if (f.properties) f.properties.lockPhase = lockPhase;
      });
    }

    try {
      const sweepSource = map.getSource("radar-sweep") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const ringsSource = map.getSource("radar-rings") as
        | mapboxgl.GeoJSONSource
        | undefined;
      const lockonSource = map.getSource("radar-lockon") as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (sweepSource) {
        sweepSource.setData({
          type: "FeatureCollection",
          features: sweepFeatures,
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
          features: cachedLockonFeatures,
        });
      }
    } catch {
      // Map destroyed or sources removed — stop animation
      return;
    }

    requestAnimationId = requestAnimationFrame(animate);
  }

  requestAnimationId = requestAnimationFrame(animate);
}

/** Cancel the asset animation loop to prevent memory leaks on map re-creation */
export function stopAssetAnimation(): void {
  if (requestAnimationId !== null) {
    cancelAnimationFrame(requestAnimationId);
    requestAnimationId = null;
  }
}
