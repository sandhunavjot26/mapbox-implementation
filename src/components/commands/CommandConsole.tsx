"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPopup,
  getPopupState,
  PopupState,
} from "@/components/map/mapController";
import type { Asset } from "@/types/assets";
import type { Target, TargetClassification } from "@/types/targets";
import { reclassifyTarget, confirmThreat } from "@/stores/mapActionsStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { useMissionStore } from "@/stores/missionStore";
import { createCommand } from "@/lib/api/commands";
import { ApiClientError } from "@/lib/api/client";
import { useCommandsStore } from "@/stores/commandsStore";
import {
  QUERY_COMMANDS,
  OPERATIONAL_COMMANDS,
  TURNTABLE_COMMANDS,
  TARGET_COMMANDS,
} from "@/lib/commands";

// Asset commands: query + operational + turntable (per doc Section 8)
const ASSET_COMMANDS = [
  ...QUERY_COMMANDS.slice(0, 3).map((c) => ({ id: c.id, label: c.label })),
  ...OPERATIONAL_COMMANDS.map((c) => ({ id: c.id, label: c.label })),
  ...TURNTABLE_COMMANDS.map((c) => ({ id: c.id, label: c.label })),
];

const CLASSIFY_OPTIONS: { id: TargetClassification; label: string }[] = [
  { id: "ENEMY", label: "Enemy" },
  { id: "FRIENDLY", label: "Friendly" },
  { id: "UNKNOWN", label: "Unknown" },
];

export function CommandConsole() {
  const [selectedState, setSelectedState] = useState<PopupState | null>(null);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const reclassifyTargetInStore = useTargetsStore((s) => s.reclassifyTarget);

  useEffect(() => {
    const unsubscribe = subscribeToPopup(() => {
      const state = getPopupState();
      setSelectedState(state?.visible && state?.isPinned ? state : null);
      setClassifyOpen(false);
      setCommandError(null);
    });
    return unsubscribe;
  }, []);

  if (!selectedState) return null;

  const { entityType, data } = selectedState;
  const entityId = (data as Asset | Target).id;
  const commands =
    entityType === "asset"
      ? ASSET_COMMANDS
      : TARGET_COMMANDS.map((c) => ({ id: c.id, label: c.label }));
  const targetData = entityType === "target" ? (data as Target) : null;

  return (
    <div className="shrink-0 border-t border-cyan-500/30 bg-slate-900 px-4 py-3">
      {commandError && (
        <div className="mb-2 flex items-center justify-between gap-2 bg-red-950/50 border border-red-500/50 px-3 py-2">
          <span className="text-red-400 text-xs font-mono">{commandError}</span>
          <button
            type="button"
            onClick={() => setCommandError(null)}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
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
                            reclassifyTargetInStore(entityId, opt.id);
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
            if (cmd.id === "JAM_START" && entityType === "target") {
              const handleEngage = async () => {
                confirmThreat(entityId);
                if (activeMissionId && targetData) {
                  const t = targetData as Target & { deviceId?: string | null };
                  const deviceId = t?.deviceId;
                  if (deviceId) {
                    setCommandPending(true);
                    setCommandError(null);
                    try {
                      const out = await createCommand({
                        mission_id: activeMissionId,
                        device_id: deviceId,
                        command_type: "JAM_START",
                        payload: {},
                      });
                      useCommandsStore.getState().addOrUpdateCommand({
                        id: out.id,
                        mission_id: out.mission_id,
                        device_id: out.device_id,
                        command_type: out.command_type,
                        status: out.status,
                        approved_count: out.approved_count,
                        required_approvals: out.required_approvals,
                        last_error: out.last_error,
                      });
                    } catch (err) {
                      setCommandError(
                        err instanceof ApiClientError
                          ? err.detail ?? err.message
                          : "Command failed. Check network."
                      );
                    } finally {
                      setCommandPending(false);
                    }
                  }
                }
              };
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={handleEngage}
                  disabled={
                    targetData?.classification !== "ENEMY" || commandPending
                  }
                  className="px-3 py-1.5 text-xs font-mono border border-red-500/60 text-red-400 hover:border-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cmd.label}
                </button>
              );
            }
            if (cmd.id === "TURNTABLE_POINT" && entityType === "target") {
              const handleTrack = async () => {
                if (activeMissionId && targetData) {
                  const t = targetData as Target & { deviceId?: string | null };
                  const deviceId = t?.deviceId;
                  if (deviceId && t?.coordinates) {
                    setCommandPending(true);
                    setCommandError(null);
                    try {
                      const out = await createCommand({
                        mission_id: activeMissionId,
                        device_id: deviceId,
                        command_type: "TURNTABLE_POINT",
                        payload: {
                          lat: t.coordinates[1],
                          lon: t.coordinates[0],
                        },
                      });
                      useCommandsStore.getState().addOrUpdateCommand({
                        id: out.id,
                        mission_id: out.mission_id,
                        device_id: out.device_id,
                        command_type: out.command_type,
                        status: out.status,
                        approved_count: out.approved_count,
                        required_approvals: out.required_approvals,
                        last_error: out.last_error,
                      });
                    } catch (err) {
                      setCommandError(
                        err instanceof ApiClientError
                          ? err.detail ?? err.message
                          : "Command failed. Check network."
                      );
                    } finally {
                      setCommandPending(false);
                    }
                  }
                }
              };
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={handleTrack}
                  disabled={commandPending}
                  className="px-3 py-1.5 text-xs font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                >
                  {cmd.label}
                </button>
              );
            }
            if (entityType === "asset" && activeMissionId) {
              const handleAssetCommand = async () => {
                const deviceId = entityId;
                setCommandPending(true);
                setCommandError(null);
                try {
                  const out = await createCommand({
                    mission_id: activeMissionId,
                    device_id: deviceId,
                    command_type: cmd.id,
                    payload: {},
                  });
                  useCommandsStore.getState().addOrUpdateCommand({
                    id: out.id,
                    mission_id: out.mission_id,
                    device_id: out.device_id,
                    command_type: out.command_type,
                    status: out.status,
                    approved_count: out.approved_count,
                    required_approvals: out.required_approvals,
                    last_error: out.last_error,
                  });
                } catch (err) {
                  setCommandError(
                    err instanceof ApiClientError
                      ? err.detail ?? err.message
                      : "Command failed. Check network."
                  );
                } finally {
                  setCommandPending(false);
                }
              };
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={handleAssetCommand}
                  disabled={commandPending}
                  className="px-3 py-1.5 text-xs font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                >
                  {cmd.label}
                </button>
              );
            }
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {}}
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
