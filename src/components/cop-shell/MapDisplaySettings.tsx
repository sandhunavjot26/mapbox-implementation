"use client";

import type { BasemapVariant, MapLightPreset } from "@/utils/mapboxBasemapConfig";

export type MapDisplaySettingsProps = {
  mapMode: "2D" | "3D";
  onMapMode: (m: "2D" | "3D") => void;
  basemapVariant: BasemapVariant;
  onBasemapVariant: (v: BasemapVariant) => void;
  mapLightPreset: MapLightPreset;
  onMapLightPreset: (p: MapLightPreset) => void;
};

/**
 * Basemap, light preset, and 2D/3D toggles — shared between Settings overlay and any future surfaces.
 */
export function MapDisplaySettings({
  mapMode,
  onMapMode,
  basemapVariant,
  onBasemapVariant,
  mapLightPreset,
  onMapLightPreset,
}: MapDisplaySettingsProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-500 text-[11px] font-mono uppercase tracking-wide">
        Map
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-slate-600/80 bg-black/45 p-0.5">
          <button
            type="button"
            onClick={() => onBasemapVariant("standard")}
            className={`rounded-full px-2.5 py-1 text-[12px] font-mono transition-colors ${basemapVariant === "standard"
              ? "bg-slate-600 text-slate-100"
              : "text-slate-400 hover:text-slate-200"}`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => onBasemapVariant("standard-satellite")}
            className={`rounded-full px-2.5 py-1 text-[12px] font-mono transition-colors ${basemapVariant === "standard-satellite"
              ? "bg-slate-600 text-slate-100"
              : "text-slate-400 hover:text-slate-200"}`}
          >
            Satellite
          </button>
        </div>
        <div className="flex rounded-full border border-slate-600/80 bg-black/45 p-0.5">
          <button
            type="button"
            onClick={() => onMapLightPreset("day")}
            className={`rounded-full px-2.5 py-1 text-[12px] font-mono transition-colors ${mapLightPreset === "day"
              ? "bg-slate-600 text-slate-100"
              : "text-slate-400 hover:text-slate-200"}`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => onMapLightPreset("night")}
            className={`rounded-full px-2.5 py-1 text-[12px] font-mono transition-colors ${mapLightPreset === "night"
              ? "bg-slate-600 text-slate-100"
              : "text-slate-400 hover:text-slate-200"}`}
          >
            Dark
          </button>
        </div>
        <div className="flex rounded border border-slate-700/80 bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => onMapMode("2D")}
            className={`px-2.5 py-1 text-xs font-mono transition-colors ${mapMode === "2D"
              ? "bg-cyan-600 text-slate-100"
              : "text-slate-400 hover:text-slate-200"}`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => onMapMode("3D")}
            className={`px-2.5 py-1 text-xs font-mono border-l border-slate-700/80 transition-colors ${mapMode === "3D"
              ? "bg-cyan-600 text-slate-100"
              : "text-slate-400 hover:text-slate-200"}`}
          >
            3D
          </button>
        </div>
      </div>
    </div>
  );
}
