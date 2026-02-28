/**
 * Zones layer — TL-1/TL-2 polygons from mission map features.
 * Renders zone_geojson as fill + outline, colored by priority:
 *   - priority 1 (TL-1): red (critical threat zone)
 *   - priority 2 (TL-2): amber/orange (elevated threat zone)
 *   - other priorities: blue (default)
 */

import mapboxgl from "mapbox-gl";

const ZONE_SOURCE_ID = "mission-zones";

/**
 * Priority-based color scheme using Mapbox data-driven styling.
 * Uses the `priority` property from zone GeoJSON features.
 */
const ZONE_FILL_COLOR: mapboxgl.Expression = [
  "match",
  ["coerce", ["get", "priority"], 0],
  1,
  "rgba(239, 68, 68, 0.25)", // TL-1: red, higher opacity
  2,
  "rgba(245, 158, 11, 0.20)", // TL-2: amber
  "rgba(59, 130, 246, 0.15)", // default: blue
];

const ZONE_LINE_COLOR: mapboxgl.Expression = [
  "match",
  ["coerce", ["get", "priority"], 0],
  1,
  "#ef4444", // TL-1: red
  2,
  "#f59e0b", // TL-2: amber
  "#3b82f6", // default: blue
];

const ZONE_LINE_WIDTH: mapboxgl.Expression = [
  "match",
  ["coerce", ["get", "priority"], 0],
  1,
  3, // TL-1: thicker border
  2,
  2, // TL-2: normal
  1.5, // default
];

/** Add zones layer from GeoJSON FeatureCollection */
export function addZonesLayer(
  map: mapboxgl.Map,
  geoJSON: GeoJSON.FeatureCollection,
): void {
  if (map.getSource(ZONE_SOURCE_ID)) {
    const source = map.getSource(ZONE_SOURCE_ID) as mapboxgl.GeoJSONSource;
    source.setData(geoJSON);
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
    paint: {
      "fill-color": ZONE_FILL_COLOR as unknown as string,
      "fill-opacity": 1, // opacity baked into the rgba colors
    },
  });

  map.addLayer({
    id: "zones-outline",
    type: "line",
    source: ZONE_SOURCE_ID,
    paint: {
      "line-color": ZONE_LINE_COLOR as unknown as string,
      "line-width": ZONE_LINE_WIDTH as unknown as number,
      "line-opacity": 0.8,
    },
  });

  // Zone label layer — show priority label at zone centroid
  map.addLayer({
    id: "zones-label",
    type: "symbol",
    source: ZONE_SOURCE_ID,
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
    },
  });
}

/** Update zones data */
export function setZonesLayerData(
  map: mapboxgl.Map,
  geoJSON: GeoJSON.FeatureCollection,
): void {
  const source = map.getSource(ZONE_SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (source) source.setData(geoJSON);
}
