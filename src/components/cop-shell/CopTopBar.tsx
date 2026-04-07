"use client";

import { StatusBadge } from "@/components/status/StatusBadge";
import { WsStatusIndicator } from "@/components/status/WsStatusIndicator";
import type { WsStatus } from "@/stores/wsStatusStore";
import type { BasemapVariant, MapLightPreset } from "@/utils/mapboxBasemapConfig";

type WsTriple = {
  eventsStatus: WsStatus;
  devicesStatus: WsStatus;
  commandsStatus: WsStatus;
};

export type CopTopBarProps = {
  interceptStats: { neutralized: number; confirmed: number; successRate: number };
  mapMode: "2D" | "3D";
  onMapMode: (m: "2D" | "3D") => void;
  basemapVariant: BasemapVariant;
  onBasemapVariant: (v: BasemapVariant) => void;
  mapLightPreset: MapLightPreset;
  onMapLightPreset: (p: MapLightPreset) => void;
  showWs: boolean;
  ws: WsTriple;
  onLogout: () => void;
};

export function CopTopBar({
  interceptStats,
  mapMode,
  onMapMode,
  basemapVariant,
  onBasemapVariant,
  mapLightPreset,
  onMapLightPreset,
  showWs,
  ws,
  onLogout,
}: CopTopBarProps) {
  return (
    <header className="pointer-events-auto absolute top-0 left-0 right-0 z-[11] flex flex-wrap items-center justify-end gap-4 px-4 py-2 bg-gradient-to-b from-black/50 to-transparent">
      {showWs && (
        <WsStatusIndicator
          eventsStatus={ws.eventsStatus}
          devicesStatus={ws.devicesStatus}
          commandsStatus={ws.commandsStatus}
        />
      )}
      <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
        <span>
          Neutralized:{" "}
          <span className="text-green-400">{interceptStats.neutralized}</span>
        </span>
        <span>
          Engagements:{" "}
          <span className="text-amber-400">{interceptStats.confirmed}</span>
        </span>
        <span>
          Success:{" "}
          <span className="text-cyan-400">{interceptStats.successRate}%</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-slate-600/80 bg-black/45 p-0.5">
          <button
            type="button"
            onClick={() => onBasemapVariant("standard")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${basemapVariant === "standard"
                ? "bg-slate-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => onBasemapVariant("standard-satellite")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${basemapVariant === "standard-satellite"
                ? "bg-slate-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            Satellite
          </button>
        </div>
        <div className="flex rounded-full border border-slate-600/80 bg-black/45 p-0.5">
          <button
            type="button"
            onClick={() => onMapLightPreset("day")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${mapLightPreset === "day"
                ? "bg-slate-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => onMapLightPreset("night")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${mapLightPreset === "night"
                ? "bg-slate-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
              }`}
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
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => onMapMode("3D")}
            className={`px-2.5 py-1 text-xs font-mono border-l border-slate-700/80 transition-colors ${mapMode === "3D"
                ? "bg-cyan-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            3D
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-slate-400 text-xs font-mono">ONLINE</span>
      </div>
      {/* <div className="hidden sm:flex items-center gap-2">
        <StatusBadge color="red" label="COP" />
      </div> */}
      <button
        type="button"
        onClick={onLogout}
        className="text-xs font-mono text-slate-500 hover:text-red-400 transition-colors px-2 py-1 border border-slate-700/80 rounded"
      >
        Logout
      </button>
    </header>
  );
}
