import type mapboxgl from "mapbox-gl";
import type { SavedFence } from "@/types/aeroshield";

export const DRAFT_SOURCE_ID = "create-fence-draft";
export const SAVED_SOURCE_ID = "create-fence-saved";

const DRAFT_FILL_LAYER_ID = "create-fence-draft-fill";
const DRAFT_OUTLINE_LAYER_ID = "create-fence-draft-outline";
const SAVED_FILL_LAYER_ID = "create-fence-saved-fill";
const SAVED_OUTLINE_LAYER_ID = "create-fence-saved-outline";

/** Legacy symbol layer (fence name on map) — removed; tear down if still present. */
const LEGACY_SAVED_LABEL_LAYER_ID = "create-fence-saved-label";
const LEGACY_SAVED_LABEL_SOURCE_ID = "create-fence-saved-label-src";

export const FENCE_TOGGLE_LAYER_IDS: readonly string[] = [
  DRAFT_FILL_LAYER_ID,
  DRAFT_OUTLINE_LAYER_ID,
  SAVED_FILL_LAYER_ID,
  SAVED_OUTLINE_LAYER_ID,
];

const ALL_LAYER_IDS = [
  DRAFT_FILL_LAYER_ID,
  DRAFT_OUTLINE_LAYER_ID,
  SAVED_FILL_LAYER_ID,
  SAVED_OUTLINE_LAYER_ID,
  LEGACY_SAVED_LABEL_LAYER_ID,
];
const ALL_SOURCE_IDS = [
  DRAFT_SOURCE_ID,
  SAVED_SOURCE_ID,
  LEGACY_SAVED_LABEL_SOURCE_ID,
];

export function toPolygonFeatureCollection(
  features: Array<GeoJSON.Feature<GeoJSON.Polygon>>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return { type: "FeatureCollection", features };
}

function removeLegacyFenceLabelLayer(map: mapboxgl.Map) {
  if (map.getLayer(LEGACY_SAVED_LABEL_LAYER_ID)) {
    map.removeLayer(LEGACY_SAVED_LABEL_LAYER_ID);
  }
  if (map.getSource(LEGACY_SAVED_LABEL_SOURCE_ID)) {
    map.removeSource(LEGACY_SAVED_LABEL_SOURCE_ID);
  }
}

export function ensureFenceLayers(map: mapboxgl.Map) {
  removeLegacyFenceLabelLayer(map);

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
}

/**
 * Push draft + saved GeoJSON to the map. Prefer this at user-action boundaries (cancel, delete,
 * reset): draft previews can exist while `isStyleLoaded()` is still false, but callers must not
 * skip updates when that flag briefly lags — do-try + `style.load` retry matches Mapbox patterns.
 */
export function syncFenceLayersToMap(
  map: mapboxgl.Map | null | undefined,
  draftGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null,
  savedFences: SavedFence[],
): void {
  if (!map) return;

  const apply = () => {
    updateFenceLayers(map, draftGeometry, savedFences);
  };

  try {
    apply();
  } catch {
    map.once("style.load", apply);
    return;
  }

  if (!map.isStyleLoaded()) {
    map.once("style.load", apply);
  }
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
