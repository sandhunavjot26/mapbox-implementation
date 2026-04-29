"use client";

/**
 * Turntable controls — D-pad for TURNTABLE_DIR + point inputs for TURNTABLE_POINT.
 * Per GUI Developer Guide: direction 0–8 (stop, up, down, left, right, diagonals), speed 0–127.
 * TURNTABLE_POINT: h_enable, horizontal (azimuth), v_enable, vertical (elevation).
 */

import { useState } from "react";
import { createCommand } from "@/lib/api/commands";
import { ApiClientError } from "@/lib/api/client";
import { useCommandsStore } from "@/stores/commandsStore";
import type { Asset } from "@/types/assets";

/** Direction values per document: 0=stop, 1=up, 2=down, 3=left, 4=right, 5–8=diagonals */
const DIRECTION_GRID: { dir: number; label: string; row: number; col: number }[] = [
  { dir: 5, label: "↖", row: 0, col: 0 },
  { dir: 1, label: "↑", row: 0, col: 1 },
  { dir: 6, label: "↗", row: 0, col: 2 },
  { dir: 3, label: "←", row: 1, col: 0 },
  { dir: 0, label: "●", row: 1, col: 1 },
  { dir: 4, label: "→", row: 1, col: 2 },
  { dir: 7, label: "↙", row: 2, col: 0 },
  { dir: 2, label: "↓", row: 2, col: 1 },
  { dir: 8, label: "↘", row: 2, col: 2 },
];

function formatCommandError(err: unknown): string {
  if (err instanceof ApiClientError) {
    const d: unknown = (err as ApiClientError & { detail?: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const msgs = (d as Array<{ msg?: string }>).map((e) => e?.msg ?? JSON.stringify(e));
      return msgs.join("; ") || err.message;
    }
    if (d && typeof d === "object") return JSON.stringify(d);
    return err.message ?? "Command failed";
  }
  return "Command failed. Check network.";
}

interface TurntableControlsProps {
  asset: Asset;
  missionId: string;
}

export function TurntableControls({ asset, missionId }: TurntableControlsProps) {
  const [dirPending, setDirPending] = useState(false);
  const [pointPending, setPointPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(63);
  const [horizontal, setHorizontal] = useState(180);
  const [vertical, setVertical] = useState(10);
  const [hEnable, setHEnable] = useState(true);
  const [vEnable, setVEnable] = useState(true);

  const addCommand = (out: { id: string; mission_id: string; device_id: string | null; command_type: string; status: string; approved_count?: number; required_approvals?: number; last_error?: string | null; packet_no?: number | null }) => {
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
  };

  const handleDirection = async (direction: number) => {
    if (!missionId) return;
    setDirPending(true);
    setError(null);
    try {
      const out = await createCommand({
        mission_id: missionId,
        device_id: asset.id,
        command_type: "TURNTABLE_DIR",
        payload: { direction, speed },
      });
      addCommand(out);
    } catch (err) {
      setError(formatCommandError(err));
    } finally {
      setDirPending(false);
    }
  };

  const handlePoint = async () => {
    if (!missionId) return;
    setPointPending(true);
    setError(null);
    try {
      const out = await createCommand({
        mission_id: missionId,
        device_id: asset.id,
        command_type: "TURNTABLE_POINT",
        payload: {
          h_enable: hEnable ? 1 : 0,
          horizontal,
          v_enable: vEnable ? 1 : 0,
          vertical,
        },
      });
      addCommand(out);
    } catch (err) {
      setError(formatCommandError(err));
    } finally {
      setPointPending(false);
    }
  };

  const pending = dirPending || pointPending;

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-950/50 border border-red-500/50 px-2 py-1">
          <span className="text-red-400 text-[11px] font-mono truncate flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-slate-400 hover:text-slate-200 text-xs shrink-0" aria-label="Dismiss">×</button>
        </div>
      )}

      {/* D-pad section */}
      <div>
        <div className="text-[11px] font-mono text-slate-500 mb-1">Direction</div>
        <div className="grid grid-cols-3 gap-0.5 w-[72px]">
          {DIRECTION_GRID.map(({ dir, label }) => (
            <button
              key={dir}
              type="button"
              onClick={() => handleDirection(dir)}
              disabled={pending}
              className="w-6 h-6 text-[11px] font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={dir === 0 ? "Stop" : `Direction ${dir}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-mono text-slate-500">Speed</span>
          <input
            type="range"
            min={0}
            max={127}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1 h-1.5 accent-cyan-500"
          />
          <span className="text-[11px] font-mono text-slate-400 w-6">{speed}</span>
        </div>
      </div>

      {/* Point section */}
      <div className="border-t border-slate-700/50 pt-2">
        <div className="text-[11px] font-mono text-slate-500 mb-1">Point (azimuth / elevation)</div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <label className="flex items-center gap-1 text-slate-500">
              <input type="checkbox" checked={hEnable} onChange={(e) => setHEnable(e.target.checked)} className="rounded" />
              H
            </label>
            <input
              type="number"
              min={0}
              max={360}
              value={horizontal}
              onChange={(e) => setHorizontal(Number(e.target.value))}
              className="w-full mt-0.5 px-1.5 py-0.5 bg-slate-800 border border-slate-600 text-slate-300 text-[11px]"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-slate-500">
              <input type="checkbox" checked={vEnable} onChange={(e) => setVEnable(e.target.checked)} className="rounded" />
              V
            </label>
            <input
              type="number"
              min={-90}
              max={90}
              value={vertical}
              onChange={(e) => setVertical(Number(e.target.value))}
              className="w-full mt-0.5 px-1.5 py-0.5 bg-slate-800 border border-slate-600 text-slate-300 text-[11px]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handlePoint}
          disabled={pending}
          className="mt-1 w-full px-2 py-1 text-[11px] font-mono border border-slate-600 text-slate-300 hover:border-cyan-500/70 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
        >
          {pointPending ? "Moving…" : "Point"}
        </button>
      </div>
    </div>
  );
}
