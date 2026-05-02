"use client";

/**
 * MissionHudTimelineTab — Figma-aligned vertical timeline for the mission detail HUD.
 * Node 2308:22770. Each row shows a relative timestamp, event title, a lat/lon secondary
 * line (placeholder until the API ships description), and a category chip.
 */

import type { MissionEventEntry } from "@/stores/missionEventsStore";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useMissionStore } from "@/stores/missionStore";
import { COLOR, FONT, SPACING } from "@/styles/driifTokens";

type ChipVariant = "system" | "detection" | "alert" | "operator";

function resolveChipVariant(eventType: string): ChipVariant {
  const t = eventType.toUpperCase();
  if (t === "DETECTED" || t === "UAV_DETECTED") return "detection";
  if (
    t.includes("JAM") ||
    t.includes("BREACH") ||
    t.includes("ALERT") ||
    t === "ZONE_ENTER"
  )
    return "alert";
  if (t === "TRACK_RATED") return "operator";
  return "system";
}

interface ChipStyle {
  bg: string;
  text: string;
  label: string;
}

function resolveChipStyle(variant: ChipVariant): ChipStyle {
  switch (variant) {
    case "detection":
      return {
        bg: COLOR.missionHudEventChipDetectionBg,
        text: COLOR.missionHudEventChipDetectionText,
        label: "Detection",
      };
    case "alert":
      return {
        bg: COLOR.missionHudEventChipAlertBg,
        text: COLOR.missionHudEventChipAlertText,
        label: "Alert",
      };
    case "operator":
      return {
        bg: COLOR.missionHudEventChipOperatorBg,
        text: COLOR.missionHudEventChipOperatorText,
        label: "Operator",
      };
    default:
      return {
        bg: COLOR.missionHudEventChipSystemBg,
        text: COLOR.missionHudEventChipSystemText,
        label: "System",
      };
  }
}

function humanEventTitle(eventType: string): string {
  const map: Record<string, string> = {
    DETECTED: "UAV detected",
    UAV_DETECTED: "UAV detected",
    JAM_STARTED: "Jamming started",
    JAM_STOPPED: "Jamming stopped",
    MISSION_STARTED: "Mission monitoring starts",
    MISSION_STOPPED: "Mission stopped",
    TRACK_RATED: "Track rated by operator",
    ZONE_ENTER: "Object entered zone",
    ZONE_EXIT: "Object exited zone",
    NFZ_BREACH: "No-fly zone breach",
    NFZ_BREACH_PREDICTED: "NFZ breach predicted",
    BREACH_RING_ENTERED: "Threat ring entered",
    COMMAND_SENT: "Command sent",
    COMMAND_SUCCEEDED: "Command succeeded",
    COMMAND_FAILED: "Command failed",
    COMMAND_TIMEOUT: "Command timed out",
    SWARM_DETECTED: "Swarm detected",
  };
  return (
    map[eventType] ??
    eventType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatRelativeOffset(refMs: number, evTs: string): string {
  const evMs = Date.parse(evTs);
  if (!Number.isFinite(evMs)) return "+?";
  const diffMs = Math.max(0, evMs - refMs);
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `+${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `+${m}:${String(s).padStart(2, "0")}`;
}

function extractLatLon(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const lat = p.uav_lat ?? p.lat ?? p.latitude;
  const lon = p.uav_lon ?? p.lon ?? p.longitude;
  if (typeof lat === "number" && typeof lon === "number") {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
  return null;
}

export function MissionHudTimelineTab() {
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const cachedMission = useMissionStore((s) => s.cachedMission);
  const events = useMissionEventsStore((s) => s.events);

  const missionEvents = activeMissionId
    ? events.filter((e) => e.mission_id === activeMissionId)
    : events;

  const refTs =
    cachedMission?.activated_at ??
    missionEvents[0]?.ts ??
    cachedMission?.created_at;
  const refMs = refTs ? Date.parse(refTs) : NaN;

  if (!activeMissionId) return null;

  if (missionEvents.length === 0) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-4 py-10"
        style={{
          color: COLOR.missionHudSectionLabel,
          fontSize: FONT.sizeXs,
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        No events yet
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ fontFamily: `${FONT.family}, sans-serif` }}
    >
      {missionEvents.map((entry: MissionEventEntry, idx) => {
        const variant = resolveChipVariant(entry.event_type);
        const chip = resolveChipStyle(variant);
        const title = humanEventTitle(entry.event_type);
        const latLon = extractLatLon(entry.payload);
        const secondary =
          latLon ??
          (entry.device_id
            ? `Device …${entry.device_id.slice(-8)}`
            : null);
        const isLast = idx === missionEvents.length - 1;

        return (
          <div
            key={entry.id}
            className="flex w-full"
            style={{
              paddingTop: "2px",
              gap: SPACING.missionHudTimelineRailGap,
            }}
          >
            {/* Left column: relative time + dashed connector */}
            <div
              className="flex flex-col items-center gap-2 pb-2 pt-0.5 shrink-0"
              style={{
                width: SPACING.missionHudTimelineTimeColWidth,
                minWidth: SPACING.missionHudTimelineTimeColWidth,
              }}
            >
              <span
                style={{
                  fontSize: FONT.sizeXs,
                  lineHeight: "14px",
                  color: COLOR.missionHudSectionLabel,
                  textAlign: "right",
                  display: "block",
                  width: "100%",
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Number.isFinite(refMs)
                  ? formatRelativeOffset(refMs, entry.ts)
                  : new Date(entry.ts).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </span>
              {!isLast && (
                <div
                  style={{
                    flex: "1 0 0",
                    width: "1px",
                    minHeight: "1px",
                    borderLeft: `1px dashed ${COLOR.missionHudTimelineLine}`,
                    alignSelf: "center",
                  }}
                />
              )}
            </div>

            {/* Right column: event title + secondary + chip */}
            <div
              className="flex min-w-0 flex-1 items-start"
              style={{
                paddingBottom: "20px",
                gap: SPACING.missionWorkspaceHeaderGap,
              }}
            >
              <div
                className="flex min-w-0 flex-1 flex-col"
                style={{
                  gap: "6px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                    color: "#FFFFFF",
                    fontFamily: `${FONT.family}, sans-serif`,
                  }}
                >
                  {title}
                </span>
                {secondary && (
                  <span
                    style={{
                      fontSize: FONT.sizeXs,
                      lineHeight: "12px",
                      color: COLOR.missionHudSectionLabel,
                      fontFamily: `${FONT.family}, sans-serif`,
                    }}
                  >
                    {secondary}
                  </span>
                )}
              </div>

              {/* Category chip */}
              <div
                className="flex shrink-0 items-center justify-center overflow-hidden"
                style={{
                  height: "24px",
                  padding: "4px 8px",
                  borderRadius: "2px",
                  background: chip.bg,
                }}
              >
                <span
                  style={{
                    fontSize: FONT.sizeXs,
                    lineHeight: "12px",
                    color: chip.text,
                    whiteSpace: "nowrap",
                    fontFamily: `${FONT.family}, sans-serif`,
                  }}
                >
                  {chip.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
