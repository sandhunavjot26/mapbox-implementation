"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MAP_LAYER_TOGGLES,
  type MapLayerToggleKey,
  type MapLayerToggles,
  MAP_LAYER_TOGGLES_STORAGE_KEY,
} from "@/components/map/mapLayerGroups";

function loadToggles(): MapLayerToggles {
  if (typeof window === "undefined") return { ...DEFAULT_MAP_LAYER_TOGGLES };
  try {
    const raw = window.localStorage.getItem(MAP_LAYER_TOGGLES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MAP_LAYER_TOGGLES };
    const parsed = JSON.parse(raw) as Partial<MapLayerToggles>;
    return {
      ...DEFAULT_MAP_LAYER_TOGGLES,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_MAP_LAYER_TOGGLES };
  }
}

export function useMapLayerToggles() {
  const [toggles, setToggles] = useState<MapLayerToggles>(loadToggles);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MAP_LAYER_TOGGLES_STORAGE_KEY,
        JSON.stringify(toggles),
      );
    } catch {
      /* private mode / quota */
    }
  }, [toggles]);

  const setToggle = useCallback((key: MapLayerToggleKey, value: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setToggles({ ...DEFAULT_MAP_LAYER_TOGGLES });
  }, []);

  return { toggles, setToggle, resetToDefaults };
}
