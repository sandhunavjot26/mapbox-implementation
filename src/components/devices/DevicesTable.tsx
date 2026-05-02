"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Device, DeviceStatus } from "@/types/aeroshield";
import type { DeviceStatusEntry } from "@/stores/deviceStatusStore";
import { COLOR, FONT, SPACING } from "@/styles/driifTokens";
import {
  driifAssetsCardBg,
  driifAssetsInMissionPill,
  driifAssetsMutedStatusPill,
  driifAssetsOfflineStatusPill,
  driifAssetsOnlineStatusPill,
  driifAssetsTypePillBlue,
  driifAssetsTypePillOlive,
} from "./deviceAdminStyles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAssetId(d: Device): string {
  const mon = d.monitor_device_id;
  if (typeof mon === "number") return `#${String(mon).padStart(5, "0")}`;
  const s = d.serial_number ?? "";
  return s.length <= 10 ? `#${s}` : `#${s.slice(-8)}`;
}

function deviceTypeRibbon(deviceType: Device["device_type"]): {
  label: string;
  pillStyle: CSSProperties;
} {
  switch (deviceType) {
    case "DETECTION_JAMMER":
      return { label: "Detection Jammer", pillStyle: driifAssetsTypePillBlue };
    case "DETECTION":
      return { label: "Detection", pillStyle: driifAssetsTypePillBlue };
    case "JAMMER":
      return { label: "Jammer", pillStyle: driifAssetsTypePillOlive };
    default:
      return {
        label: String(deviceType).replace(/_/g, " "),
        pillStyle: driifAssetsTypePillBlue,
      };
  }
}

type DisplayStatus = "ONLINE" | "OFFLINE" | "IN_MISSION" | "OTHER";

function resolveDisplayStatus(
  d: Device,
  live: DeviceStatusEntry | undefined
): DisplayStatus {
  const raw = (live?.status ?? d.status ?? "").toUpperCase();
  if (raw === "ONLINE") return "ONLINE";
  if (raw === "OFFLINE") return "OFFLINE";
  if (raw === "WORKING" || raw === "IDLE") return "IN_MISSION";
  return "OTHER";
}

function statusPill(s: DisplayStatus, rawStatus: DeviceStatus): {
  style: CSSProperties;
  label: string;
} {
  if (s === "ONLINE") return { style: driifAssetsOnlineStatusPill, label: "Online" };
  if (s === "OFFLINE") return { style: driifAssetsOfflineStatusPill, label: "Offline" };
  if (s === "IN_MISSION") return { style: driifAssetsInMissionPill, label: "In-Mission" };
  return {
    style: driifAssetsMutedStatusPill,
    label: rawStatus.charAt(0) + rawStatus.slice(1).toLowerCase(),
  };
}

// ---------------------------------------------------------------------------
// Custom Checkbox — matches Figma: 14×14 dark square, border changes on check
// ---------------------------------------------------------------------------

function AssetCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="shrink-0 flex items-center justify-center"
      style={{
        width: 14,
        height: 14,
        background: "#1A1A1A",
        border: `1px solid ${checked ? "#FFFFFF" : "#404040"}`,
        borderRadius: 2,
        cursor: "pointer",
        padding: 0,
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path
            d="M2 5l2.5 2.5L8 3"
            stroke="#C6E600"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  devices: Device[];
  liveStatusById: Record<string, DeviceStatusEntry | undefined>;
  lastSeen: Map<string, string>;
  missionName: (id: string | null) => string;
  protocolLabel: (name: string | undefined) => string;
  canRead: boolean;
  canUpdate: boolean;
  onEdit: (d: Device) => void;
  onAssignMission: (d: Device) => void;
  selectedIds: Set<string>;
  onToggleSelect: (deviceId: string) => void;
};

const linkBtn: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: COLOR.missionsTitleMuted,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeXs,
  lineHeight: "16px",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DevicesTable({
  devices,
  liveStatusById,
  lastSeen: _lastSeen,
  missionName,
  protocolLabel,
  canRead,
  canUpdate,
  onEdit,
  onAssignMission,
  selectedIds,
  onToggleSelect,
}: Props) {
  if (!canRead) {
    return (
      <p
        className="p-3"
        style={{
          color: COLOR.statusWarning,
          fontSize: FONT.sizeSm,
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        You do not have permission to view devices.
      </p>
    );
  }
  if (devices.length === 0) {
    return (
      <p
        className="p-3"
        style={{
          color: COLOR.missionsSecondaryText,
          fontSize: FONT.sizeSm,
          fontFamily: `${FONT.family}, sans-serif`,
        }}
      >
        No devices match the filters.
      </p>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        gap: SPACING.missionListCardStackGap,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      {devices.map((d) => {
        const live = liveStatusById[d.id];
        const displayStatus = resolveDisplayStatus(d, live);
        const { style: pillStyle, label: pillLabel } = statusPill(
          displayStatus,
          d.status
        );
        const ribbon = deviceTypeRibbon(d.device_type);
        const protocol =
          protocolLabel(d.protocol ?? undefined) || d.protocol || "—";
        const missionLine = d.mission_id ? missionName(d.mission_id) : null;

        /* Telemetry row for drone-like states (battery + coords) */
        const hasBattery = live?.battery_pct != null;
        const hasCoords =
          typeof d.latitude === "number" && typeof d.longitude === "number";
        const showTelemetry = hasBattery || hasCoords;

        /* Id color based on online state */
        const idColor =
          displayStatus === "ONLINE"
            ? "rgba(255,255,255,0.4)"
            : "#8F8F8F";

        return (
          <div
            key={d.id}
            className="flex w-full flex-col overflow-hidden"
            style={{
              ...driifAssetsCardBg,
              padding: "12px",
              gap: "8px",
            }}
          >
            {/* Row 1 — tag left edge aligns with radar icon below (checkbox column + same gap as row 2) */}
            <div className="flex w-full items-center gap-2.5">
              <div className="shrink-0" style={{ width: 14 }} aria-hidden />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="inline-flex shrink-0" style={ribbon.pillStyle}>
                  {ribbon.label}
                </span>
                <span className="shrink-0" style={pillStyle}>
                  {pillLabel}
                </span>
              </div>
            </div>

            {/* Row 2 — checkbox + main body uses full remaining width */}
            <div className="flex w-full items-start gap-2.5">
              <div className="flex shrink-0 pt-[3px]">
                <AssetCheckbox
                  checked={selectedIds.has(d.id)}
                  onChange={() => onToggleSelect(d.id)}
                />
              </div>

              <div className="min-w-0 flex flex-1 flex-col gap-1">
                {/* Avatar + name + id on one row */}
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className="shrink-0 overflow-hidden rounded-full"
                      style={{ width: 24, height: 24 }}
                      aria-hidden
                    >
                      <Image
                        src="/icons/list-radar-icon.svg"
                        alt=""
                        width={24}
                        height={24}
                        unoptimized
                      />
                    </div>
                    <span
                      className="min-w-0"
                      style={{
                        fontSize: FONT.sizeMd,
                        lineHeight: "20px",
                        fontWeight: FONT.weightNormal,
                        color: "#F5F5F5",
                      }}
                    >
                      {d.name}
                    </span>
                  </div>
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: FONT.sizeSm,
                      lineHeight: "20px",
                      color: idColor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatAssetId(d)}
                  </span>
                </div>

                {/* Protocol / model */}
                <p
                  style={{
                    fontSize: FONT.sizeSm,
                    lineHeight: "16px",
                    color: "#A3A3A3",
                    opacity: displayStatus === "ONLINE" ? 1 : 0.7,
                    margin: 0,
                  }}
                >
                  {protocol}
                </p>

                {/* Telemetry */}
                {showTelemetry && (
                  <div
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5"
                    style={{
                      fontSize: FONT.sizeSm,
                      lineHeight: "16px",
                      color: "#A3A3A3",
                      opacity: 0.7,
                    }}
                  >
                    {hasBattery && (
                      <span className="flex items-center gap-0.5">
                        <Image
                          src="/icons/BatteryMedium.svg"
                          alt="Battery"
                          width={16}
                          height={16}
                          unoptimized
                        />
                        {Math.round(live!.battery_pct!)}%
                      </span>
                    )}
                    {hasCoords && (
                      <span className="flex items-center gap-0.5">
                        <Image
                          src="/icons/MapPin.svg"
                          alt="Location"
                          width={12}
                          height={12}
                          unoptimized
                        />
                        {d.latitude.toFixed(6)}, {d.longitude.toFixed(6)}
                      </span>
                    )}
                  </div>
                )}

                {/* Mission — full width of row 2 so long names stay on one line when space allows */}
                {missionLine && (
                  <p
                    className="min-w-0 max-w-full"
                    style={{
                      fontSize: FONT.sizeSm,
                      lineHeight: "16px",
                      color: "#A3A3A3",
                      margin: 0,
                    }}
                  >
                    Mission: {missionLine}
                  </p>
                )}

                {canUpdate && (
                  <div
                    className="flex flex-wrap gap-x-3 gap-y-1"
                    style={{ marginTop: 6 }}
                  >
                    <button
                      type="button"
                      style={linkBtn}
                      onClick={() => onEdit(d)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={linkBtn}
                      onClick={() => onAssignMission(d)}
                    >
                      Assign
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
