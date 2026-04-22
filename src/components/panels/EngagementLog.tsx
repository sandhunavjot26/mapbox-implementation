"use client";

import { useEffect, useState } from "react";
import { subscribeToEngagementLog } from "@/stores/mapActionsStore";
import type { EngagementLogEntry } from "@/stores/mapActionsStore";
import { COLOR, FONT } from "@/styles/driifTokens";

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

export function EngagementLog({
  defaultCollapsed = true,
  layout = "default",
}: {
  defaultCollapsed?: boolean;
  layout?: "default" | "workspace";
} = {}) {
  const [entries, setEntries] = useState<EngagementLogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    return subscribeToEngagementLog(setEntries);
  }, []);

  if (layout === "workspace") {
    if (entries.length === 0) return null;
    return (
      <div
        className="driif-mission-scrollbar max-h-[40%] min-h-0 min-w-0 shrink-0 overflow-y-auto border-b border-solid pb-2"
        style={{
          fontFamily: `${FONT.mono}, monospace`,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={`${entry.targetId}-${entry.completedAt}-${i}`}
            className="border-t border-solid py-1.5 first:border-t-0"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
              style={{ fontFamily: `${FONT.family}, sans-serif` }}
            >
              <span style={{ color: COLOR.missionCreateFieldText }}>{entry.targetId}</span>
              <span style={{ color: COLOR.missionsSecondaryText }}>→</span>
              <span style={{ color: COLOR.accentCyan }}>{entry.assetId}</span>
            </div>
            <div
              className="mt-0.5 flex flex-wrap justify-between gap-2"
              style={{ color: COLOR.missionsSecondaryText, fontSize: "10px" }}
            >
              <span>
                {formatTime(entry.startedAt)} → {formatTime(entry.completedAt)}
              </span>
              <span style={{ color: "#4ade80" }}>{formatDuration(entry.completedAt - entry.startedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="border-t border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-slate-800/30"
      >
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Engagement log ({entries.length})
        </span>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${collapsed ? "" : "rotate-180"}`}
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
              className="flex items-center justify-between gap-4 border-b border-slate-800/50 px-4 py-2 font-mono text-xs last:border-0"
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
