"use client";

/**
 * Mission timeline — DETECTED, JAM_STARTED, COMMAND_* from WebSocket.
 * `layout="workspace"`: flat in tab panel, table only (no inner card), driif tokens.
 */

import { useState } from "react";
import type { MissionEventEntry } from "@/stores/missionEventsStore";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useMissionStore } from "@/stores/missionStore";
import { COLOR, FONT } from "@/styles/driifTokens";
import {
  missionEventDeviceLabel,
  missionEventLocation,
} from "@/utils/missionEventDisplay";

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

function eventStyle(eventType: string): { color: string } {
  if (eventType === "DETECTED") return { color: "#fbbf24" };
  if (eventType.startsWith("JAM")) return { color: "#f87171" };
  if (eventType.includes("SUCCEEDED")) return { color: "#4ade80" };
  if (eventType.includes("FAILED") || eventType === "COMMAND_TIMEOUT") {
    return { color: "#f87171" };
  }
  return { color: COLOR.missionCreateFieldText };
}

export function MissionTimeline({
  defaultCollapsed = true,
  layout = "default",
}: {
  defaultCollapsed?: boolean;
  layout?: "default" | "workspace";
} = {}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const cachedDevices = useMissionStore((s) => s.cachedMission?.devices);
  const events = useMissionEventsStore((s) => s.events);

  const missionEvents = activeMissionId
    ? events.filter((e) => e.mission_id === activeMissionId)
    : events;

  if (!activeMissionId) return null;

  if (layout === "workspace") {
    return (
      <div
        className="driif-mission-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        style={{ fontFamily: `${FONT.mono}, monospace` }}
      >
        {missionEvents.length === 0 ? (
          <div
            className="px-1 py-3"
            style={{ fontSize: FONT.sizeXs, color: COLOR.missionsSecondaryText }}
          >
            No events yet
          </div>
        ) : (
          <table
            className="w-full min-w-0 table-fixed"
            style={{ fontSize: "11px" }}
          >
            <thead>
              <tr
                className="sticky top-0 z-10"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: COLOR.missionsSecondaryText,
                  fontSize: "10px",
                  background: "rgba(26, 26, 26, 0.98)",
                  fontFamily: `${FONT.family}, sans-serif`,
                }}
              >
                <th
                  className="w-[24%] px-1.5 py-1.5 text-left font-bold"
                  style={{ color: COLOR.missionsSecondaryText }}
                >
                  Event
                </th>
                <th
                  className="w-[24%] px-1.5 py-1.5 text-left font-bold"
                  style={{ color: COLOR.missionsSecondaryText }}
                >
                  Device
                </th>
                <th
                  className="w-[32%] px-1.5 py-1.5 text-left font-bold"
                  style={{ color: COLOR.missionsSecondaryText }}
                >
                  Location
                </th>
                <th
                  className="w-[20%] px-1.5 py-1.5 text-right font-bold"
                  style={{ color: COLOR.missionsSecondaryText }}
                >
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {missionEvents.map((entry: MissionEventEntry) => {
                const loc = missionEventLocation(entry.payload);
                const dev = missionEventDeviceLabel(entry, cachedDevices);
                return (
                  <tr
                    key={entry.id}
                    className="border-t border-solid"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <td
                      className="px-1.5 py-1.5 font-medium align-top"
                      style={{
                        ...eventStyle(entry.event_type),
                        fontFamily: `${FONT.family}, sans-serif`,
                      }}
                    >
                      {eventLabel(entry.event_type)}
                    </td>
                    <td
                      className="min-w-0 px-1.5 py-1.5 align-top"
                      style={{
                        color: COLOR.missionCreateFieldText,
                        fontFamily: `${FONT.family}, sans-serif`,
                      }}
                    >
                      <span className="line-clamp-2" title={dev}>
                        {dev}
                      </span>
                    </td>
                    <td
                      className="min-w-0 px-1.5 py-1.5 align-top"
                      style={{ color: COLOR.missionsSecondaryText }}
                    >
                      <span className="line-clamp-2" title={loc === "—" ? "No position in this event" : loc}>
                        {loc}
                      </span>
                    </td>
                    <td
                      className="shrink-0 px-1.5 py-1.5 text-right align-top"
                      style={{ color: COLOR.missionsSecondaryText }}
                    >
                      {formatTime(entry.ts)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950/30">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-slate-800/30"
      >
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Mission timeline ({missionEvents.length})
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
        <div className="max-h-40 overflow-y-auto border-t border-slate-800">
          {missionEvents.length === 0 ? (
            <div className="px-4 py-3 font-mono text-xs text-slate-500">No events yet</div>
          ) : (
            missionEvents.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 border-b border-slate-800/50 px-4 py-2 font-mono text-xs last:border-0"
              >
                <span className={`shrink-0 font-medium ${eventColorClass(entry.event_type)}`}>
                  {eventLabel(entry.event_type)}
                </span>
                <span className="truncate text-slate-500">
                  {entry.device_id
                    ? missionEventDeviceLabel(entry, cachedDevices)
                    : "—"}
                </span>
                <span className="shrink-0 text-slate-500">{formatTime(entry.ts)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function eventColorClass(eventType: string): string {
  if (eventType === "DETECTED") return "text-amber-400";
  if (eventType.startsWith("JAM")) return "text-red-400";
  if (eventType.includes("SUCCEEDED")) return "text-green-400";
  if (eventType.includes("FAILED") || eventType === "COMMAND_TIMEOUT") {
    return "text-red-400";
  }
  return "text-slate-400";
}
