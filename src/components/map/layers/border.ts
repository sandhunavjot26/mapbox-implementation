/**
 * Mission border layer — mission_border from map features.
 */

import mapboxgl from "mapbox-gl";

const BORDER_SOURCE_ID = "mission-border";

/** Add or update mission border layer */
export function setBorderLayer(
  map: mapboxgl.Map,
  feature: GeoJSON.Feature<GeoJSON.Polygon> | null
): void {
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: feature ? [feature] : [],
  };

  if (map.getSource(BORDER_SOURCE_ID)) {
    const source = map.getSource(BORDER_SOURCE_ID) as mapboxgl.GeoJSONSource;
    source.setData(fc);
    return;
  }

  map.addSource(BORDER_SOURCE_ID, {
    type: "geojson",
    data: fc,
  });

  map.addLayer({
    id: "border-fill",
    type: "fill",
    source: BORDER_SOURCE_ID,
    slot: "top",
    paint: {
      "fill-color": "transparent",
      "fill-opacity": 0,
    },
  });

  map.addLayer({
    id: "border-outline",
    type: "line",
    source: BORDER_SOURCE_ID,
    slot: "top",
    paint: {
      "line-color": "#22d3ee",
      "line-width": 2,
      "line-dasharray": [2, 1],
      "line-opacity": 0.95,
      "line-emissive-strength": 1,
      "line-color-use-theme": "disabled",
    },
  });
}
