"use client";

import { useEffect, useState } from "react";
import { subscribeToPopup, getPopupState, PopupState } from "@/components/map/mapController";
import { Asset } from "@/mock/assets";
import { Target } from "@/mock/targets";

// Mock commands per entity type
const ASSET_COMMANDS = [
  { id: "CALIBRATE", label: "Calibrate" },
  { id: "REPOSITION", label: "Reposition" },
  { id: "PING", label: "Ping" },
  { id: "DISABLE", label: "Disable" },
];

const TARGET_COMMANDS = [
  { id: "TRACK", label: "Track" },
  { id: "CLASSIFY", label: "Classify" },
  { id: "WARN", label: "Warn" },
  { id: "ENGAGE", label: "Engage" },
];

function handleCommand(commandType: string, entityId: string) {
  console.log("Command issued:", commandType, entityId);
}

export function CommandConsole() {
  const [selectedState, setSelectedState] = useState<PopupState | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPopup(() => {
      // Read latest state from controller when notified
      const state = getPopupState();
      setSelectedState(state?.visible && state?.isPinned ? state : null);
    });
    return unsubscribe;
  }, []);

  if (!selectedState) return null;

  const { entityType, data } = selectedState;
  const entityId = (data as Asset | Target).id;
  const commands = entityType === "asset" ? ASSET_COMMANDS : TARGET_COMMANDS;

  return (
    <div className="shrink-0 border-t border-cyan-500/30 bg-slate-900 px-4 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Entity summary */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-cyan-400/90 text-xs font-mono uppercase tracking-wider shrink-0">
            Command console · {entityType}
          </span>
          {entityType === "asset" ? (
            <AssetSummary data={data as Asset} />
          ) : (
            <TargetSummary data={data as Target} />
          )}
        </div>

        {/* Command buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {commands.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => handleCommand(cmd.id, entityId)}
              className="px-3 py-1.5 text-xs font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetSummary({ data }: { data: Asset }) {
  return (
    <span className="text-slate-300 text-xs font-mono truncate">
      {data.name} · {data.id} · {data.area} · {data.status}
    </span>
  );
}

function TargetSummary({ data }: { data: Target }) {
  return (
    <span className="text-slate-300 text-xs font-mono truncate">
      {data.id} · {data.classification} · {data.distanceKm.toFixed(1)} km
    </span>
  );
}
