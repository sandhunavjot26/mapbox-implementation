/**
 * Zones layer — polygons from mission map features.
 * Renders zone_geojson as fill + outline, colored by priority:
 *   - priority 1 (TL-1): red (critical threat zone)
 *   - priority 2 (TL-2): amber (elevated threat zone)
 *   - priority 3: green
 *   - priority 4: purple
 *   - priority 5: pink
 *   - priority 6: yellow
 *   - other: blue (default)
 */

import mapboxgl from "mapbox-gl";

/** Set `false` to hide zone polygon fills; outlines + TL labels stay visible. */
export const SHOW_MISSION_ZONE_FILLS = false;

const ZONE_SOURCE_ID = "mission-zones";

/**
 * Priority-based color scheme using Mapbox data-driven styling.
 * Uses the `priority` property from zone GeoJSON features.
 */
const ZONE_FILL_COLOR: mapboxgl.Expression = [
  "match",
  ["to-number", ["get", "priority"], 0],
  1,
  "rgba(239, 68, 68, 0.25)", // TL-1: red
  2,
  "rgba(245, 158, 11, 0.20)", // TL-2: amber
  3,
  "rgba(34, 197, 94, 0.22)", // green
  4,
  "rgba(168, 85, 247, 0.22)", // purple
  5,
  "rgba(236, 72, 153, 0.22)", // pink
  6,
  "rgba(234, 179, 8, 0.22)", // yellow
  "rgba(59, 130, 246, 0.15)", // default: blue
];

const ZONE_LINE_COLOR: mapboxgl.Expression = [
  "match",
  ["to-number", ["get", "priority"], 0],
  1,
  "#ef4444", // TL-1: red
  2,
  "#f59e0b", // TL-2: amber
  3,
  "#22c55e", // green
  4,
  "#a855f7", // purple
  5,
  "#ec4899", // pink
  6,
  "#eab308", // yellow
  "#3b82f6", // default: blue
];

const ZONE_SLOT = "top" as const;

const ZONE_LINE_WIDTH: mapboxgl.Expression = [
  "match",
  ["to-number", ["get", "priority"], 0],
  1,
  3, // TL-1: thicker
  2,
  2, // TL-2
  1.5, // default for 3–6 and others
];

/** Add zones layer from GeoJSON FeatureCollection */
export function addZonesLayer(
  map: mapboxgl.Map,
  geoJSON: GeoJSON.FeatureCollection,
): void {
  if (map.getSource(ZONE_SOURCE_ID)) {
    const source = map.getSource(ZONE_SOURCE_ID) as mapboxgl.GeoJSONSource;
    source.setData(geoJSON);
    try {
      map.setPaintProperty(
        "zones-fill",
        "fill-opacity",
        SHOW_MISSION_ZONE_FILLS ? 1 : 0,
      );
    } catch {
      /* layer missing during style swap */
    }
    return;
  }

  map.addSource(ZONE_SOURCE_ID, {
    type: "geojson",
    data: geoJSON,
  });

  map.addLayer({
    id: "zones-fill",
    type: "fill",
    source: ZONE_SOURCE_ID,
    slot: ZONE_SLOT,
    paint: {
      "fill-color": ZONE_FILL_COLOR as unknown as string,
      "fill-opacity": SHOW_MISSION_ZONE_FILLS ? 0.6 : 0,
      "fill-emissive-strength": 0.85,
      "fill-color-use-theme": "disabled",
    },
  });

  map.addLayer({
    id: "zones-outline",
    type: "line",
    source: ZONE_SOURCE_ID,
    slot: ZONE_SLOT,
    paint: {
      "line-color": ZONE_LINE_COLOR as unknown as string,
      "line-width": ZONE_LINE_WIDTH as unknown as number,
      "line-opacity": SHOW_MISSION_ZONE_FILLS ? 0.6 : 0,
      "line-emissive-strength": 0.85,
      "line-color-use-theme": "disabled",
    },
  });

  // Zone label layer — show priority label at zone centroid
  map.addLayer({
    id: "zones-label",
    type: "symbol",
    source: ZONE_SOURCE_ID,
    slot: ZONE_SLOT,
    layout: {
      "text-field": [
        "concat",
        "TL-",
        ["to-string", ["coerce", ["get", "priority"], 0]],
      ] as unknown as string,
      "text-size": 11,
      "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": ZONE_LINE_COLOR as unknown as string,
      "text-halo-color": "rgba(0,0,0,0.8)",
      "text-halo-width": 1.5,
      "text-opacity": 0.9,
      "text-emissive-strength": 0.75,
      "text-color-use-theme": "disabled",
    },
  });
}

/**
 * Update zones data. If the map never had zones at first `mountOperationalLayers`
 * (mission still loading), there is no source yet — create layers here so late
 * `cachedMission.zones` / map features still show.
 */
export function setZonesLayerData(
  map: mapboxgl.Map,
  geoJSON: GeoJSON.FeatureCollection,
): void {
  const source = map.getSource(ZONE_SOURCE_ID) as
    | mapboxgl.GeoJSONSource
    | undefined;
  if (source) {
    source.setData(geoJSON);
    return;
  }
  if (geoJSON.features.length > 0) {
    addZonesLayer(map, geoJSON);
  }
}
