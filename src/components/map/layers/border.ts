/**
 * Mission border layer — renders one or more mission border polygons.
 * On landing: all missions with border_geojson (colors inferred from vertex count).
 * On mission select: the active mission's border from map features.
 */

import mapboxgl from "mapbox-gl";
import type { MapLightPreset } from "@/utils/mapboxBasemapConfig";

const BORDER_SOURCE_ID = "mission-border";
const BORDER_LABEL_SOURCE_ID = "mission-border-label-src";
const BORDER_FILL_LAYER_ID = "border-fill";
const BORDER_OUTLINE_LAYER_ID = "border-outline";
const BORDER_LABEL_LAYER_ID = "border-label";

/** Layer ids toggled with map "zones / geofences" (mission border). */
export const BORDER_TOGGLE_LAYER_IDS = [
  BORDER_FILL_LAYER_ID,
  BORDER_OUTLINE_LAYER_ID,
  BORDER_LABEL_LAYER_ID,
] as const satisfies readonly string[];

/** Fence-creation colors keyed by inferred shape type. */
const SHAPE_COLORS: Record<string, { fill: string; outline: string }> = {
  square: { fill: "#9E5CFF", outline: "#9E5CFF" },
  circle: { fill: "#00D68F", outline: "#00D68F" },
  polygon: { fill: "#FF30C6", outline: "#FF30C6" },
};

const DEFAULT_BORDER_COLOR = "#22d3ee";

/** High contrast on Standard / light basemap (outline purple is illegible on pale terrain). */
const LABEL_DAY_TEXT_COLOR = "#141414";
const LABEL_DAY_HALO = "rgba(255,255,255,0.95)";

const LABEL_NIGHT_TEXT_COLOR: mapboxgl.ExpressionSpecification = [
  "coalesce",
  ["get", "outlineColor"],
  DEFAULT_BORDER_COLOR,
];

/**
 * Update mission name label paint when switching Light / Dark (Standard preset).
 * Call after `setBorderLayer` and when only the light preset changes (no style reload).
 */
export function applyBorderLabelLightPreset(
  map: mapboxgl.Map,
  preset: MapLightPreset,
): void {
  if (!map.getLayer(BORDER_LABEL_LAYER_ID)) return;
  if (preset === "day") {
    map.setPaintProperty(BORDER_LABEL_LAYER_ID, "text-color", LABEL_DAY_TEXT_COLOR);
    map.setPaintProperty(BORDER_LABEL_LAYER_ID, "text-halo-color", LABEL_DAY_HALO);
    map.setPaintProperty(BORDER_LABEL_LAYER_ID, "text-halo-width", 2);
    map.setPaintProperty(BORDER_LABEL_LAYER_ID, "text-halo-blur", 0.25);
  } else {
    map.setPaintProperty(
      BORDER_LABEL_LAYER_ID,
      "text-color",
      LABEL_NIGHT_TEXT_COLOR,
    );
    map.setPaintProperty(
      BORDER_LABEL_LAYER_ID,
      "text-halo-color",
      "rgba(0,0,0,0.85)",
    );
    map.setPaintProperty(BORDER_LABEL_LAYER_ID, "text-halo-width", 1.2);
    map.setPaintProperty(BORDER_LABEL_LAYER_ID, "text-halo-blur", 0);
  }
}

/**
 * Infer the drawing tool used from the number of ring vertices.
 * 5 = square (4 corners + close), >50 = circle (64 segments), else polygon.
 */
function inferShapeType(ring: GeoJSON.Position[]): string {
  const n = ring.length;
  if (n === 5) return "square";
  if (n > 50) return "circle";
  return "polygon";
}

/**
 * Ensure each feature carries fillColor/outlineColor in its properties.
 * If already present (e.g. from fence drawing), keep the original values.
 * Otherwise infer from vertex count.
 */
function enrichFeatureColors(
  features: GeoJSON.Feature<GeoJSON.Polygon>[],
): GeoJSON.Feature<GeoJSON.Polygon>[] {
  return features.map((f) => {
    if (f.properties?.outlineColor) return f;
    const ring = f.geometry.coordinates[0] ?? [];
    const type = inferShapeType(ring);
    const colors = SHAPE_COLORS[type] ?? SHAPE_COLORS.polygon;
    return {
      ...f,
      properties: {
        ...f.properties,
        fillColor: colors.fill,
        outlineColor: colors.outline,
      },
    };
  });
}

/** Top-center of a polygon: horizontal center, maximum latitude. */
function polygonTopCenter(ring: GeoJSON.Position[]): [number, number] {
  const pts =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0]
      ? ring.slice(0, -1)
      : ring;
  if (pts.length === 0) return [0, 0];
  let lngSum = 0;
  let maxLat = -Infinity;
  for (const p of pts) {
    lngSum += p[0];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return [lngSum / pts.length, maxLat];
}

function toLabelFeatures(
  features: GeoJSON.Feature<GeoJSON.Polygon>[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: features
      .filter((f) => f.properties?.missionName)
      .map((f) => ({
        type: "Feature" as const,
        properties: {
          name: f.properties?.missionName ?? "",
          outlineColor: f.properties?.outlineColor ?? DEFAULT_BORDER_COLOR,
        },
        geometry: {
          type: "Point" as const,
          coordinates: polygonTopCenter(f.geometry.coordinates[0] ?? []),
        },
      })),
  };
}

/**
 * Set mission border data. Accepts an array of polygon features (empty = clear).
 * Creates sources/layers on first call; updates data on subsequent calls.
 */
export function setBorderLayer(
  map: mapboxgl.Map,
  features: GeoJSON.Feature<GeoJSON.Polygon>[],
  mapLightPreset: MapLightPreset = "day",
): void {
  const enriched = enrichFeatureColors(features);
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: enriched,
  };

  if (map.getSource(BORDER_SOURCE_ID)) {
    (map.getSource(BORDER_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(fc);
    if (map.getSource(BORDER_LABEL_SOURCE_ID)) {
      (map.getSource(BORDER_LABEL_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
        toLabelFeatures(enriched),
      );
    }
    applyBorderLabelLightPreset(map, mapLightPreset);
    return;
  }

  map.addSource(BORDER_SOURCE_ID, { type: "geojson", data: fc });

  map.addLayer({
    id: BORDER_FILL_LAYER_ID,
    type: "fill",
    source: BORDER_SOURCE_ID,
    slot: "top",
    paint: {
      "fill-color": [
        "coalesce",
        ["get", "fillColor"],
        DEFAULT_BORDER_COLOR,
      ],
      "fill-opacity": 0.08,
      "fill-emissive-strength": 1,
      "fill-color-use-theme": "disabled",
    },
  });

  map.addLayer({
    id: BORDER_OUTLINE_LAYER_ID,
    type: "line",
    source: BORDER_SOURCE_ID,
    slot: "top",
    paint: {
      "line-color": [
        "coalesce",
        ["get", "outlineColor"],
        DEFAULT_BORDER_COLOR,
      ],
      "line-width": 2,
      "line-dasharray": [2, 1],
      "line-opacity": 0.95,
      "line-emissive-strength": 1,
      "line-color-use-theme": "disabled",
    },
  });

  map.addSource(BORDER_LABEL_SOURCE_ID, {
    type: "geojson",
    data: toLabelFeatures(enriched),
  });

  map.addLayer({
    id: BORDER_LABEL_LAYER_ID,
    type: "symbol",
    source: BORDER_LABEL_SOURCE_ID,
    slot: "top",
    layout: {
      "text-field": ["get", "name"] as unknown as string,
      "text-size": 13,
      "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
      "text-allow-overlap": false,
      "text-anchor": "bottom",
    },
    paint: {
      "text-color": LABEL_DAY_TEXT_COLOR,
      "text-halo-color": LABEL_DAY_HALO,
      "text-halo-width": 2,
      "text-halo-blur": 0.25,
      "text-emissive-strength": 1,
      "text-color-use-theme": "disabled",
    },
  });

  applyBorderLabelLightPreset(map, mapLightPreset);
}
