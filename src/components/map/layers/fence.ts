import type mapboxgl from "mapbox-gl";
import type { SavedFence } from "@/types/aeroshield";
import {
  type Coordinate,
  FENCE_MODE_COLORS,
  getPolygonCentroid,
} from "@/utils/fenceGeometry";

export const DRAFT_SOURCE_ID = "create-fence-draft";
export const SAVED_SOURCE_ID = "create-fence-saved";
export const SAVED_LABEL_SOURCE_ID = "create-fence-saved-label-src";
const DRAFT_FILL_LAYER_ID = "create-fence-draft-fill";
const DRAFT_OUTLINE_LAYER_ID = "create-fence-draft-outline";
const SAVED_FILL_LAYER_ID = "create-fence-saved-fill";
const SAVED_OUTLINE_LAYER_ID = "create-fence-saved-outline";
const SAVED_LABEL_LAYER_ID = "create-fence-saved-label";

const ALL_LAYER_IDS = [
  DRAFT_FILL_LAYER_ID,
  DRAFT_OUTLINE_LAYER_ID,
  SAVED_FILL_LAYER_ID,
  SAVED_OUTLINE_LAYER_ID,
  SAVED_LABEL_LAYER_ID,
];
const ALL_SOURCE_IDS = [DRAFT_SOURCE_ID, SAVED_SOURCE_ID, SAVED_LABEL_SOURCE_ID];

export function toPolygonFeatureCollection(
  features: Array<GeoJSON.Feature<GeoJSON.Polygon>>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return { type: "FeatureCollection", features };
}

export function toLabelCollection(
  fences: SavedFence[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: fences.map((fence) => ({
      type: "Feature" as const,
      properties: {
        name: fence.name,
        outlineColor:
          fence.geometry.properties?.outlineColor ??
          FENCE_MODE_COLORS[fence.mode].outline,
      },
      geometry: {
        type: "Point" as const,
        coordinates: getPolygonCentroid(
          fence.geometry.geometry.coordinates[0] as Coordinate[],
        ),
      },
    })),
  };
}

export function ensureFenceLayers(map: mapboxgl.Map) {
  if (!map.getSource(DRAFT_SOURCE_ID)) {
    map.addSource(DRAFT_SOURCE_ID, {
      type: "geojson",
      data: toPolygonFeatureCollection([]),
    });
  }

  if (!map.getLayer(DRAFT_FILL_LAYER_ID)) {
    map.addLayer({
      id: DRAFT_FILL_LAYER_ID,
      type: "fill",
      source: DRAFT_SOURCE_ID,
      slot: "top",
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#FF30C6"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.16],
        "fill-emissive-strength": 1,
        "fill-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getLayer(DRAFT_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: DRAFT_OUTLINE_LAYER_ID,
      type: "line",
      source: DRAFT_SOURCE_ID,
      slot: "top",
      paint: {
        "line-color": ["coalesce", ["get", "outlineColor"], "#FF30C6"],
        "line-width": 2,
        "line-opacity": 1,
        "line-emissive-strength": 1,
        "line-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getSource(SAVED_SOURCE_ID)) {
    map.addSource(SAVED_SOURCE_ID, {
      type: "geojson",
      data: toPolygonFeatureCollection([]),
    });
  }

  if (!map.getLayer(SAVED_FILL_LAYER_ID)) {
    map.addLayer({
      id: SAVED_FILL_LAYER_ID,
      type: "fill",
      source: SAVED_SOURCE_ID,
      slot: "top",
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#FF30C6"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.16],
        "fill-emissive-strength": 1,
        "fill-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getLayer(SAVED_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: SAVED_OUTLINE_LAYER_ID,
      type: "line",
      source: SAVED_SOURCE_ID,
      slot: "top",
      paint: {
        "line-color": ["coalesce", ["get", "outlineColor"], "#FF30C6"],
        "line-width": 2,
        "line-opacity": 1,
        "line-emissive-strength": 1,
        "line-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getSource(SAVED_LABEL_SOURCE_ID)) {
    map.addSource(SAVED_LABEL_SOURCE_ID, {
      type: "geojson",
      data: toLabelCollection([]),
    });
  }

  if (!map.getLayer(SAVED_LABEL_LAYER_ID)) {
    map.addLayer({
      id: SAVED_LABEL_LAYER_ID,
      type: "symbol",
      source: SAVED_LABEL_SOURCE_ID,
      slot: "top",
      layout: {
        "text-field": ["get", "name"] as unknown as string,
        "text-size": 14,
        "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
        "text-offset": [0, 1.2],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": ["coalesce", ["get", "outlineColor"], "#FF30C6"],
        "text-halo-color": "rgba(0,0,0,0.72)",
        "text-halo-width": 1,
        "text-emissive-strength": 1,
        "text-color-use-theme": "disabled",
      },
    });
  }
}

export function updateFenceLayers(
  map: mapboxgl.Map,
  draftGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null,
  savedFences: SavedFence[],
) {
  ensureFenceLayers(map);

  const draftSource = map.getSource(DRAFT_SOURCE_ID) as mapboxgl.GeoJSONSource;
  draftSource.setData(
    toPolygonFeatureCollection(draftGeometry ? [draftGeometry] : []),
  );

  const savedSource = map.getSource(SAVED_SOURCE_ID) as mapboxgl.GeoJSONSource;
  savedSource.setData(
    toPolygonFeatureCollection(savedFences.map((f) => f.geometry)),
  );

  const labelSource = map.getSource(
    SAVED_LABEL_SOURCE_ID,
  ) as mapboxgl.GeoJSONSource;
  labelSource.setData(toLabelCollection(savedFences));
}

export function setDraftLayerData(
  map: mapboxgl.Map,
  draftGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null,
) {
  ensureFenceLayers(map);
  const draftSource = map.getSource(DRAFT_SOURCE_ID) as mapboxgl.GeoJSONSource;
  draftSource.setData(
    toPolygonFeatureCollection(draftGeometry ? [draftGeometry] : []),
  );
}

export function removeFenceLayers(map: mapboxgl.Map) {
  for (const id of ALL_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ALL_SOURCE_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
}
