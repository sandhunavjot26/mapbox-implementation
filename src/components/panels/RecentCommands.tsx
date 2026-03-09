"use client";

/**
 * Recent commands — live status from WebSocket (SENDING → SENT → SUCCEEDED/FAILED).
 * Per AeroShield Live Operations Guide Section 5.3: "Commands panel can show a live list with
 * status badge changing instantly." Enhanced with device name, packet_no, created_at, result preview.
 */

import { useState, useMemo } from "react";
import { useCommandsStore } from "@/stores/commandsStore";
import { useMissionStore } from "@/stores/missionStore";

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === "SUCCEEDED") return "text-green-400";
  if (s === "FAILED" || s === "REJECTED") return "text-red-400";
  if (s === "SENDING" || s === "SENT" || s === "PENDING") return "text-amber-400";
  return "text-slate-400";
}

/** Format ISO timestamp to short time (HH:MM:SS) */
function formatCommandTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/** Truncate result payload for preview (max ~40 chars) */
function resultPreview(payload?: Record<string, unknown> | null): string {
  if (!payload || typeof payload !== "object") return "";
  const str = JSON.stringify(payload);
  return str.length > 40 ? `${str.slice(0, 37)}…` : str;
}

export function RecentCommands() {
  const [collapsed, setCollapsed] = useState(true);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const cachedMission = useMissionStore((s) => s.cachedMission);
  const commands = useCommandsStore((s) => s.commands);

  const missionCommands = activeMissionId
    ? commands.filter((c) => c.mission_id === activeMissionId)
    : commands;

  // Map device_id to device name for display
  const deviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    cachedMission?.devices?.forEach((d) => {
      map.set(d.id, d.name ?? d.serial_number ?? d.id);
    });
    return map;
  }, [cachedMission?.devices]);

  if (!activeMissionId) return null;

  return (
    <div className="border-t border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Recent commands ({missionCommands.length})
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="max-h-40 overflow-y-auto border-t border-slate-800">
          {missionCommands.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 text-xs font-mono">
              No commands yet
            </div>
          ) : (
            missionCommands.map((cmd) => (
            <div
              key={cmd.id}
              className="px-4 py-2 flex flex-col gap-0.5 border-b border-slate-800/50 last:border-0"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-300 truncate">{cmd.command_type}</span>
                <span className={`shrink-0 font-medium ${statusColor(cmd.status)}`}>
                  {cmd.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                <span className="truncate" title={cmd.device_id ?? undefined}>
                  {cmd.device_id ? deviceNameMap.get(cmd.device_id) ?? cmd.device_id.slice(0, 8) + "…" : "—"}
                </span>
                <span>{cmd.packet_no ?? "—"}</span>
                <span>{formatCommandTime(cmd.created_at)}</span>
              </div>
              {(cmd.result_payload || cmd.last_error) && (
                <div className="text-[10px] font-mono truncate max-w-full">
                  {cmd.last_error ? (
                    <span className="text-red-400/80" title={cmd.last_error}>
                      {cmd.last_error.slice(0, 50)}…
                    </span>
                  ) : (
                    <span className="text-slate-500" title={JSON.stringify(cmd.result_payload)}>
                      {resultPreview(cmd.result_payload)}
                    </span>
                  )}
                </div>
              )}
            </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
