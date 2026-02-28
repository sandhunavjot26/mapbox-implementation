"use client";

/**
 * Recent commands — live status from WebSocket (SENDING → SENT → SUCCEEDED/FAILED).
 * Per AeroShield Live Operations Guide Section 5.3: "Commands panel can show a live list with status badge changing instantly."
 */

import { useState } from "react";
import { useCommandsStore } from "@/stores/commandsStore";
import { useMissionStore } from "@/stores/missionStore";

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === "SUCCEEDED") return "text-green-400";
  if (s === "FAILED" || s === "REJECTED") return "text-red-400";
  if (s === "SENDING" || s === "SENT" || s === "PENDING") return "text-amber-400";
  return "text-slate-400";
}

export function RecentCommands() {
  const [collapsed, setCollapsed] = useState(true);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const commands = useCommandsStore((s) => s.commands);

  const missionCommands = activeMissionId
    ? commands.filter((c) => c.mission_id === activeMissionId)
    : commands;

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
        <div className="max-h-32 overflow-y-auto border-t border-slate-800">
          {missionCommands.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 text-xs font-mono">
              No commands yet
            </div>
          ) : (
            missionCommands.map((cmd) => (
              <div
                key={cmd.id}
                className="px-4 py-2 flex items-center justify-between gap-4 text-xs font-mono border-b border-slate-800/50 last:border-0"
              >
                <span className="text-slate-300 truncate">{cmd.command_type}</span>
                <span className={`shrink-0 font-medium ${statusColor(cmd.status)}`}>
                  {cmd.status}
                </span>
                {cmd.last_error && (
                  <span className="text-red-400/80 truncate max-w-[120px]" title={cmd.last_error}>
                    {cmd.last_error.slice(0, 20)}…
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
