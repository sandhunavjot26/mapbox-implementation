"use client";

import { useEffect, useState } from "react";
import { subscribeToPopup, getPopupState, PopupState } from "@/components/map/mapController";
import { Asset } from "@/mock/assets";
import { Target, TargetClassification } from "@/mock/targets";
import { reclassifyTarget, confirmThreat } from "@/stores/mapActionsStore";

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

const CLASSIFY_OPTIONS: { id: TargetClassification; label: string }[] = [
  { id: "ENEMY", label: "Enemy" },
  { id: "FRIENDLY", label: "Friendly" },
  { id: "UNKNOWN", label: "Unknown" },
];

export function CommandConsole() {
  const [selectedState, setSelectedState] = useState<PopupState | null>(null);
  const [classifyOpen, setClassifyOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPopup(() => {
      const state = getPopupState();
      setSelectedState(state?.visible && state?.isPinned ? state : null);
      setClassifyOpen(false);
    });
    return unsubscribe;
  }, []);

  if (!selectedState) return null;

  const { entityType, data } = selectedState;
  const entityId = (data as Asset | Target).id;
  const commands = entityType === "asset" ? ASSET_COMMANDS : TARGET_COMMANDS;
  const targetData = entityType === "target" ? (data as Target) : null;

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
          {commands.map((cmd) => {
            if (cmd.id === "CLASSIFY" && entityType === "target") {
              return (
                <div key={cmd.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setClassifyOpen((o) => !o)}
                    className="px-3 py-1.5 text-xs font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
                  >
                    {cmd.label} ▾
                  </button>
                  {classifyOpen && (
                    <div className="absolute bottom-full z-50 left-0 mb-1 flex flex-col border border-slate-600 bg-slate-900 shadow-lg">
                      {CLASSIFY_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            reclassifyTarget(entityId, opt.id);
                            setClassifyOpen(false);
                          }}
                          className="px-3 py-1.5 text-xs font-mono text-left text-slate-300 hover:bg-slate-800 hover:text-cyan-400 whitespace-nowrap"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (cmd.id === "ENGAGE" && entityType === "target") {
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => confirmThreat(entityId)}
                  disabled={targetData?.classification !== "ENEMY"}
                  className="px-3 py-1.5 text-xs font-mono border border-red-500/60 text-red-400 hover:border-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cmd.label}
                </button>
              );
            }
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => { }}
                className="px-3 py-1.5 text-xs font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
              >
                {cmd.label}
              </button>
            );
          })}
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
