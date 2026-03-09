"use client";

/**
 * Mission timeline — shows DETECTED, JAM_STARTED, COMMAND_* events from WebSocket.
 * Per AeroShield Live Operations Guide Section 6.3: "Timeline panel shows DETECTED card immediately".
 */

import { useState } from "react";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useMissionStore } from "@/stores/missionStore";

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    DETECTED: "Detection",
    JAM_STARTED: "Jam started",
    JAM_STOPPED: "Jam stopped",
    COMMAND_SENT: "Command sent",
    COMMAND_SUCCEEDED: "Command succeeded",
    COMMAND_FAILED: "Command failed",
    COMMAND_TIMEOUT: "Command timeout",
  };
  return labels[eventType] ?? eventType;
}

function eventColor(eventType: string): string {
  if (eventType === "DETECTED") return "text-amber-400";
  if (eventType.startsWith("JAM")) return "text-red-400";
  if (eventType.includes("SUCCEEDED")) return "text-green-400";
  if (eventType.includes("FAILED") || eventType === "COMMAND_TIMEOUT") return "text-red-400";
  return "text-slate-400";
}

export function MissionTimeline() {
  const [collapsed, setCollapsed] = useState(true);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const events = useMissionEventsStore((s) => s.events);

  const missionEvents = activeMissionId
    ? events.filter((e) => e.mission_id === activeMissionId)
    : events;

  if (!activeMissionId) return null;

  return (
    <div className="border-t border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Mission timeline ({missionEvents.length})
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
          {missionEvents.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 text-xs font-mono">
              No events yet
            </div>
          ) : (
            missionEvents.map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-2 flex items-center justify-between gap-4 text-xs font-mono border-b border-slate-800/50 last:border-0"
              >
                <span className={`shrink-0 font-medium ${eventColor(entry.event_type)}`}>
                  {eventLabel(entry.event_type)}
                </span>
                <span className="text-slate-500 truncate">
                  {entry.device_id ? `Device ${entry.device_id.slice(0, 8)}…` : "—"}
                </span>
                <span className="text-slate-500 shrink-0">{formatTime(entry.ts)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
