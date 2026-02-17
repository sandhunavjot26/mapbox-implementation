"use client";

import { useEffect, useState } from "react";
import { subscribeToEngagementLog } from "@/stores/mapActionsStore";
import type { EngagementLogEntry } from "@/stores/mapActionsStore";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

export function EngagementLog() {
  const [entries, setEntries] = useState<EngagementLogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    return subscribeToEngagementLog(setEntries);
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="border-t border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Engagement log ({entries.length})
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
          {entries.map((entry, i) => (
            <div
              key={`${entry.targetId}-${entry.completedAt}-${i}`}
              className="px-4 py-2 flex items-center justify-between gap-4 text-xs font-mono border-b border-slate-800/50 last:border-0"
            >
              <span className="text-slate-300">{entry.targetId}</span>
              <span className="text-slate-500">→</span>
              <span className="text-cyan-400">{entry.assetId}</span>
              <span className="text-slate-500">
                {formatTime(entry.startedAt)} → {formatTime(entry.completedAt)}
              </span>
              <span className="text-green-400">
                {formatDuration(entry.completedAt - entry.startedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
