"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/types/assets";
import type { Target } from "@/types/targets";
import { subscribeToPopup, PopupState, clearSelection } from "../mapController";
import { useTargetsStore } from "@/stores/targetsStore";
import { useAttackModeStore } from "@/stores/attackModeStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { TargetPopupControls } from "@/components/commands/PopupControls";
import { AssetPopupControls } from "@/components/commands/PopupControls";

/** Staleness threshold: no update for this many seconds → show stale */
const STALE_SECONDS = 30;

// Classification color mapping
const classificationColors: Record<string, string> = {
  ENEMY: "text-red-400",
  FRIENDLY: "text-green-400",
  UNKNOWN: "text-amber-400",
};

// Status color mapping
const statusColors: Record<string, string> = {
  ACTIVE: "text-green-400",
  INACTIVE: "text-slate-500",
};

export function EntityHoverPopup() {
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const targets = useTargetsStore((s) => s.targets);

  useEffect(() => {
    // Subscribe to popup state changes
    const unsubscribe = subscribeToPopup((state) => {
      setPopupState(state);
    });

    return unsubscribe;
  }, []);

  // Don't render if no popup state or not visible
  if (!popupState || !popupState.visible) {
    return null;
  }

  const { entityType, data, screenPosition, isPinned } = popupState;

  // Offset from cursor
  const offsetX = 12;
  const offsetY = 12;

  const popupClassName = isPinned
    ? "bg-slate-900 border-2 border-cyan-500/80 backdrop-blur-sm px-3 py-2 min-w-[200px] shadow-lg shadow-cyan-500/10 relative"
    : "bg-slate-900/95 border border-slate-700 backdrop-blur-sm px-3 py-2 min-w-[180px]";

  return (
    <div
      className={`fixed z-50 ${isPinned ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{
        left: screenPosition.x + offsetX,
        top: screenPosition.y + offsetY,
      }}
    >
      <div className={popupClassName}>
        {isPinned && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute top-1 right-1 text-slate-400 hover:text-slate-200 text-sm leading-none p-0.5"
            aria-label="Close"
          >
            ×
          </button>
        )}
        {entityType === "asset" ? (
          <AssetPopupContent data={data as Asset} isPinned={isPinned} />
        ) : (
          <TargetPopupContent
            data={data as Target}
            isPinned={isPinned}
            targets={targets}
          />
        )}
      </div>
    </div>
  );
}

function formatLastSeen(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "—";
  }
}

function AssetPopupContent({
  data,
  isPinned,
}: {
  data: Asset;
  isPinned: boolean;
}) {
  const attackMode = useAttackModeStore((s) => s.getAttackMode(data.id));
  const deviceStatus = useDeviceStatusStore((s) => s.getDeviceStatus(data.id));

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/50 pr-5">
        <span className="text-slate-200 text-xs font-mono font-semibold">
          {data.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {attackMode && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 ${
                attackMode.jamActive ? "text-red-400 bg-red-950/50" : "text-slate-500 bg-slate-800"
              }`}
            >
              {attackMode.jamActive ? "Jam: ON" : "Idle"}
            </span>
          )}
          <span className={`text-[10px] font-mono ${statusColors[data.status]}`}>
            {data.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-slate-500">ID</span>
          <span className="text-slate-400 truncate max-w-[120px]">{data.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Area</span>
          <span className="text-slate-400">{data.area}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Altitude</span>
          <span className="text-slate-400">{data.altitude} FT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Coverage</span>
          <span className="text-slate-400">{data.coverageRadiusKm} KM</span>
        </div>
        {deviceStatus && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Last seen</span>
              <span className="text-slate-400 truncate max-w-[120px]">{formatLastSeen(deviceStatus.last_seen)}</span>
            </div>
            {deviceStatus.op_status != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Op status</span>
                <span className="text-slate-400">{String(deviceStatus.op_status)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {isPinned && <AssetPopupControls asset={data} />}
    </div>
  );
}

function TargetPopupContent({
  data,
  isPinned,
  targets,
}: {
  data: Target;
  isPinned: boolean;
  targets: Target[];
}) {
  // Use live target from store when available (e.g. after reclassification)
  const liveTarget = targets.find((t) => t.id === data.id);
  const target = liveTarget ?? data;

  const isStale = target.lastSeenAt != null && (Date.now() - target.lastSeenAt) / 1000 > STALE_SECONDS;
  const isLowConfidence = target.confidence != null && target.confidence < 60;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-slate-700/50 pr-5">
        <span className="text-slate-200 text-xs font-mono font-semibold truncate max-w-[140px]">
          {target.targetName ?? target.id}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isStale && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 animate-pulse whitespace-nowrap">
              Stale
            </span>
          )}
          {isLowConfidence && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-1 py-0.5 whitespace-nowrap">
              Low conf
            </span>
          )}
          <span
            className={`text-[10px] font-mono ${classificationColors[target.classification]}`}
          >
            {target.classification}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between gap-6">
          <span className="text-slate-500">Distance</span>
          <span className="text-slate-400">
            {target.distanceKm.toFixed(1)} KM
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Altitude</span>
          <span className="text-slate-400">{target.altitude} FT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Heading</span>
          <span className="text-slate-400">{target.heading}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Frequency</span>
          <span className="text-slate-400">{target.frequencyMHz} MHz</span>
        </div>
        {target.speedKmH != null && (
          <div className="flex justify-between">
            <span className="text-slate-500">Speed</span>
            <span className="text-slate-400">
              {target.speedKmH.toFixed(1)} km/h
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4 min-w-0">
          <span className="text-slate-500 shrink-0">RSSI</span>
          <span className="text-slate-400 whitespace-nowrap overflow-x-auto text-right flex-1 min-w-0">
            {typeof target.rssi === "number"
              ? target.rssi
              : Number(target.rssi ?? 0)}{" "}
            dBm
          </span>
        </div>
        {target.confidence != null && (
          <div className="flex justify-between">
            <span className="text-slate-500">Confidence</span>
            <span className="text-slate-400">{target.confidence}%</span>
          </div>
        )}
        {target.rcCoords && (
          <div className="flex justify-between gap-4 min-w-0">
            <span className="text-slate-500 shrink-0">RC/GCS</span>
            <span className="text-slate-400 truncate">
              {target.rcCoords[0].toFixed(5)}, {target.rcCoords[1].toFixed(5)}
            </span>
          </div>
        )}
      </div>

      {isPinned && <TargetPopupControls target={target} />}
    </div>
  );
}
