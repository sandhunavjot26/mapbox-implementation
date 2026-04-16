"use client";

import { useState } from "react";
import type { Asset } from "@/types/assets";
import type { Target, TargetClassification } from "@/types/targets";
import { reclassifyTarget } from "@/stores/mapActionsStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { useMissionStore } from "@/stores/missionStore";
import { createCommand } from "@/lib/api/commands";
import { useCommandsStore } from "@/stores/commandsStore";
import { formatCommandError } from "@/lib/formatCommandError";
import { executeEngageJam } from "@/lib/engageJamCommand";
import { TurntableControls } from "@/components/commands/TurntableControls";
import { BandRangeEditor } from "@/components/commands/BandRangeEditor";

// UI omits UNKNOWN per current product scope (PRD §12.4 includes it, but operator sees Friendly/Enemy only)
const CLASSIFY_OPTIONS: { id: TargetClassification; label: string }[] = [
  { id: "FRIENDLY", label: "Friendly" },
  { id: "ENEMY", label: "Enemy" },
];

/** Commands shown as simple buttons (excludes Turntable, Band Range — those have dedicated UIs) */
const ASSET_QUERY_COMMANDS = [
  { id: "ATTACK_MODE_QUERY", label: "Attack Mode Query" },
];

interface TargetPopupControlsProps {
  target: Target;
}

export function TargetPopupControls({ target }: TargetPopupControlsProps) {
  const [commandPending, setCommandPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const reclassifyTargetInStore = useTargetsStore((s) => s.reclassifyTarget);

  const handleClassify = (classification: TargetClassification) => {
    reclassifyTarget(target.id, classification);
    reclassifyTargetInStore(target.id, classification);
  };

  const handleTrack = async () => {
    if (!activeMissionId || !target) return;
    const t = target as Target & { deviceId?: string | null };
    const deviceId = t?.deviceId;
    if (!deviceId || !t?.coordinates) return;

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
        packet_no: out.packet_no ?? undefined,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      setCommandError(formatCommandError(err));
    } finally {
      setCommandPending(false);
    }
  };

  const handleEngage = async () => {
    if (target.classification !== "ENEMY") return;
    setCommandPending(true);
    setCommandError(null);
    try {
      const result = await executeEngageJam(target, activeMissionId);
      if (!result.ok) setCommandError(result.error);
    } finally {
      setCommandPending(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-700/50">
      {commandError && (
        <div className="flex items-center justify-between gap-2 bg-red-950/50 border border-red-500/50 px-2 py-1.5">
          <span className="text-red-400 text-[10px] font-mono truncate flex-1">
            {commandError}
          </span>
          <button
            type="button"
            onClick={() => setCommandError(null)}
            className="text-slate-400 hover:text-slate-200 text-xs shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {/* Classification buttons */}
      <div className="flex gap-1">
        {CLASSIFY_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleClassify(opt.id)}
            className={`flex-1 px-2 py-1 text-[10px] font-mono border transition-colors ${
              target.classification === opt.id
                ? opt.id === "ENEMY"
                  ? "border-red-500/80 bg-red-950/40 text-red-400"
                  : opt.id === "FRIENDLY"
                    ? "border-green-500/80 bg-green-950/40 text-green-400"
                    : "border-amber-500/80 bg-amber-950/40 text-amber-400"
                : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {/* Action buttons */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={handleTrack}
          disabled={commandPending}
          className="flex-1 px-2 py-1 text-[10px] font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
        >
          Track
        </button>
        <button
          type="button"
          onClick={handleEngage}
          disabled={target.classification !== "ENEMY" || commandPending}
          className="flex-1 px-2 py-1 text-[10px] font-mono border border-red-500/60 text-red-400 hover:border-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Engage
        </button>
      </div>
    </div>
  );
}

interface AssetPopupControlsProps {
  asset: Asset;
}

export function AssetPopupControls({ asset }: AssetPopupControlsProps) {
  const [commandPending, setCommandPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [showBandEditor, setShowBandEditor] = useState(false);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);

  const handleAssetCommand = async (commandType: string) => {
    if (!activeMissionId) return;

    setCommandPending(true);
    setCommandError(null);
    try {
      const out = await createCommand({
        mission_id: activeMissionId,
        device_id: asset.id,
        command_type: commandType,
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
        packet_no: out.packet_no ?? undefined,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      setCommandError(formatCommandError(err));
    } finally {
      setCommandPending(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-700/50">
      {commandError && (
        <div className="flex items-center justify-between gap-2 bg-red-950/50 border border-red-500/50 px-2 py-1.5">
          <span className="text-red-400 text-[10px] font-mono truncate flex-1">
            {commandError}
          </span>
          <button
            type="button"
            onClick={() => setCommandError(null)}
            className="text-slate-400 hover:text-slate-200 text-xs shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Query button */}
      <div className="flex flex-wrap gap-1">
        {ASSET_QUERY_COMMANDS.map((cmd) => (
          <button
            key={cmd.id}
            type="button"
            onClick={() => handleAssetCommand(cmd.id)}
            disabled={commandPending}
            className="px-2 py-1 text-[10px] font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
          >
            {cmd.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowBandEditor(true)}
          className="px-2 py-1 text-[10px] font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
        >
          Band Range
        </button>
      </div>

      {/* Turntable D-pad + Point */}
      {activeMissionId && (
        <TurntableControls asset={asset} missionId={activeMissionId} />
      )}

      {showBandEditor && activeMissionId && (
        <BandRangeEditor
          asset={asset}
          missionId={activeMissionId}
          onClose={() => setShowBandEditor(false)}
        />
      )}
    </div>
  );
}
