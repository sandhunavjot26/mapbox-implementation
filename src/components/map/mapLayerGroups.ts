/**
 * Map layer visibility groups for operator toggles (Task 1d).
 * Aligns with old-ui `aeroshield.missionMap.layers` keys.
 */

import type mapboxgl from "mapbox-gl";
import { BORDER_TOGGLE_LAYER_IDS } from "@/components/map/layers/border";
import { FENCE_TOGGLE_LAYER_IDS } from "@/components/map/layers/fence";

export type MapLayerToggleKey =
  | "zones"
  | "detection"
  | "jammer"
  | "breach";

export const MAP_LAYER_GROUPS: Record<MapLayerToggleKey, readonly string[]> = {
  zones: [
    "zones-fill",
    "zones-outline",
    "zones-label",
    ...BORDER_TOGGLE_LAYER_IDS,
    ...FENCE_TOGGLE_LAYER_IDS,
  ],
  detection: [
    "assets-coverage-fill",
    "assets-coverage-outline",
    "radar-rings-halo-layer",
    "radar-rings-layer",
    "radar-band-fills-layer",
    "radar-lockon-layer",
    "radar-sweep-detection",
  ],
  jammer: ["radar-sweep-jammer"],
  breach: [
    "breach-threat-fills-layer",
    "breach-ring-green",
    "breach-ring-yellow",
    "breach-ring-red",
  ],
};

export type MapLayerToggles = Record<MapLayerToggleKey, boolean>;

export const DEFAULT_MAP_LAYER_TOGGLES: MapLayerToggles = {
  zones: true,
  detection: true,
  jammer: true,
  breach: true,
};

/** old-ui MissionWorkspacePage `LAYERS_LS_KEY` */
export const MAP_LAYER_TOGGLES_STORAGE_KEY = "aeroshield.missionMap.layers";

export function applyMapLayerGroupVisibility(
  map: mapboxgl.Map,
  toggles: MapLayerToggles,
): void {
  for (const key of Object.keys(MAP_LAYER_GROUPS) as MapLayerToggleKey[]) {
    const visible = toggles[key];
    const visibility = visible ? "visible" : "none";
    for (const layerId of MAP_LAYER_GROUPS[key]) {
      if (!map.getLayer(layerId)) continue;
      try {
        map.setLayoutProperty(layerId, "visibility", visibility);
      } catch {
        /* style/layer race */
      }
    }
  }
}
