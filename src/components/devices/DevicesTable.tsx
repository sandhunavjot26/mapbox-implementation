"use client";

import type { CSSProperties } from "react";
import type { Device } from "@/types/aeroshield";
import { missionWorkspaceSectionLabelStyle } from "@/components/missions/MissionWorkspaceShell";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import { driifDeviceTableRowBorder } from "./deviceAdminStyles";

function formatTs(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function typePill(t: string) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: SPACING.missionCreateChipGap }}>
      <span
        style={{
          borderRadius: RADIUS.panel,
          padding: "2px 6px",
          fontSize: FONT.sizeXs,
          fontFamily: FONT.mono,
          fontWeight: FONT.weightMedium,
          background: "rgba(144, 67, 249, 0.25)",
          color: COLOR.missionsTitleMuted,
        }}
      >
        {t.replace("_", " ")}
      </span>
      {(t === "JAMMER" || t === "DETECTION_JAMMER") && (
        <span
          style={{
            borderRadius: RADIUS.panel,
            padding: "1px 4px",
            fontSize: FONT.missionReviewDetail10Size,
            lineHeight: FONT.missionReviewDetail10LineHeight,
            fontFamily: FONT.mono,
            background: COLOR.missionCreateSecondaryChipBg,
            color: COLOR.missionCreateSecondaryChipText,
          }}
        >
          JAM
        </span>
      )}
    </div>
  );
}

type Props = {
  devices: Device[];
  lastSeen: Map<string, string>;
  missionName: (id: string | null) => string;
  protocolLabel: (name: string | undefined) => string;
  canRead: boolean;
  canUpdate: boolean;
  onEdit: (d: Device) => void;
  /** Opens assign/unassign mission modal (same flow for assigned or unassigned devices). */
  onAssignMission: (d: Device) => void;
};

const textLink: CSSProperties = {
  color: COLOR.missionsTitleMuted,
  fontFamily: `${FONT.family}, sans-serif`,
  fontSize: FONT.sizeSm,
  lineHeight: "17px",
  background: "none",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

export function DevicesTable({
  devices,
  lastSeen,
  missionName,
  protocolLabel,
  canRead,
  canUpdate,
  onEdit,
  onAssignMission,
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
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse"
        style={{
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeSm,
          lineHeight: "17px",
        }}
      >
        <thead>
          <tr style={driifDeviceTableRowBorder}>
            {(
              [
                "Serial",
                "Name",
                "Type",
                "Radar model",
                "Status",
                "Last seen",
                "Mission",
                "Det / jam (m)",
                "Actions",
              ] as const
            ).map((label) => (
              <th
                key={label}
                className={`py-2 pr-3 align-bottom ${
                  label === "Actions" ? "text-right" : "text-left"
                }`}
                style={missionWorkspaceSectionLabelStyle()}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => {
            const mon = d.monitor_device_id ?? d.serial_number;
            const det = d.detection_radius_m ?? "—";
            const jam = d.jammer_radius_m ?? "—";
            return (
              <tr
                key={d.id}
                style={{
                  ...driifDeviceTableRowBorder,
                  color: COLOR.missionsBodyText,
                }}
                className="hover:bg-white/[0.04]"
              >
                <td
                  className="py-2.5 pr-3 align-top"
                  style={{ fontFamily: FONT.mono, fontSize: FONT.sizeSm }}
                >
                  {mon}
                </td>
                <td className="py-2.5 pr-3 align-top">{d.name}</td>
                <td className="py-2.5 pr-3 align-top">{typePill(d.device_type)}</td>
                <td className="py-2.5 pr-3 align-top">
                  <span
                    style={{
                      borderRadius: RADIUS.panel,
                      padding: "2px 6px",
                      fontSize: FONT.sizeXs,
                      fontFamily: FONT.mono,
                      background: COLOR.missionsCardBg,
                      color: COLOR.missionsSecondaryText,
                    }}
                  >
                    {protocolLabel(d.protocol ?? undefined) || d.protocol || "—"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 align-top">
                  <span
                    style={{
                      borderRadius: RADIUS.panel,
                      padding: "2px 6px",
                      fontSize: FONT.sizeXs,
                      fontFamily: FONT.mono,
                      background:
                        d.status === "ONLINE"
                          ? COLOR.missionCreateRadarStatusPillBg
                          : "rgba(148, 163, 184, 0.15)",
                      color:
                        d.status === "ONLINE"
                          ? COLOR.missionCreateRadarStatusPillText
                          : COLOR.missionsSecondaryText,
                    }}
                  >
                    {d.status}
                  </span>
                </td>
                <td
                  className="py-2.5 pr-3 align-top"
                  style={{
                    fontSize: FONT.sizeXs,
                    fontFamily: FONT.mono,
                    color: COLOR.missionsSecondaryText,
                  }}
                >
                  {formatTs(lastSeen.get(d.id))}
                </td>
                <td className="py-2.5 pr-3 align-top" style={{ fontSize: FONT.sizeSm }}>
                  {d.mission_id ? (
                    <div>
                      <div style={{ color: COLOR.missionsBodyText }}>
                        {missionName(d.mission_id)}
                      </div>
                      <div
                        className="max-w-[140px] truncate"
                        style={{
                          fontSize: FONT.missionReviewDetail10Size,
                          fontFamily: FONT.mono,
                          color: COLOR.missionsSecondaryText,
                        }}
                      >
                        {d.mission_id}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: COLOR.missionsSecondaryText }}>—</span>
                  )}
                </td>
                <td
                  className="py-2.5 pr-3 align-top"
                  style={{ fontFamily: FONT.mono, fontSize: FONT.sizeSm }}
                >
                  <span style={{ color: COLOR.accentCyan }}>{String(det)}</span>
                  <span style={{ color: COLOR.missionsSecondaryText }}> / </span>
                  <span style={{ color: COLOR.statusWarning }}>{String(jam)}</span>
                </td>
                <td className="py-2.5 pl-2 text-right align-top whitespace-nowrap">
                  {canUpdate && (
                    <>
                      <button
                        type="button"
                        style={{ ...textLink, marginRight: 8 }}
                        onClick={() => onEdit(d)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        style={textLink}
                        onClick={() => onAssignMission(d)}
                      >
                        Assign
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
