"use client";

import type { Device } from "@/types/aeroshield";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

function statusPill(
  s: string,
): { bg: string; fg: string } {
  const u = s.toUpperCase();
  if (u === "ONLINE" || u === "WORKING")
    return {
      bg: COLOR.missionCreateRadarStatusPillBg,
      fg: COLOR.missionCreateRadarStatusPillText,
    };
  if (u === "OFFLINE" || u === "UNKNOWN")
    return {
      bg: COLOR.missionCreateRadarStatusOfflinePillBg,
      fg: COLOR.missionCreateRadarStatusOfflinePillText,
    };
  return { bg: "rgba(148, 163, 184, 0.15)", fg: COLOR.missionsTitleMuted };
}

export function MissionDevicesTab({ devices }: { devices: Device[] | undefined }) {
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);

  if (!devices?.length) {
    return (
      <p
        style={{
          margin: 0,
          color: COLOR.missionsSecondaryText,
          fontFamily: `${FONT.family}, sans-serif`,
          fontSize: FONT.sizeSm,
        }}
      >
        No devices on this mission.
      </p>
    );
  }

  return (
    <ul
      className="driif-mission-scrollbar flex flex-col gap-2 overflow-y-auto p-0"
      style={{ margin: 0, listStyle: "none" }}
    >
      {devices.map((d) => {
        const live = byDeviceId[d.id];
        const st = (live?.status ?? d.status ?? "UNKNOWN").toString();
        const pill = statusPill(st);
        return (
          <li
            key={d.id}
            style={{
              background: COLOR.missionsCardBg,
              border: `1px solid ${COLOR.border}`,
              borderRadius: RADIUS.panel,
              padding: SPACING.missionCreateListItemPadY + " " + SPACING.missionCreateListItemPadX,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeSm,
                    color: COLOR.missionsBodyText,
                    fontWeight: FONT.weightMedium,
                  }}
                >
                  {d.name || d.serial_number}
                </div>
                <div
                  style={{
                    fontFamily: `${FONT.family}, sans-serif`,
                    fontSize: FONT.sizeXs,
                    color: COLOR.missionsSecondaryText,
                    marginTop: "2px",
                  }}
                >
                  {d.serial_number} · {d.device_type}
                  {d.protocol ? ` · ${d.protocol}` : ""}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  padding: "2px 8px",
                  borderRadius: RADIUS.panel,
                  background: pill.bg,
                  color: pill.fg,
                  fontSize: FONT.sizeXs,
                  fontWeight: FONT.weightMedium,
                }}
              >
                {st}
              </span>
            </div>
            <div
              style={{
                marginTop: "8px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 8px",
                fontFamily: `${FONT.mono}, monospace`,
                fontSize: FONT.sizeXs,
                color: COLOR.missionsSecondaryText,
              }}
            >
              <span>
                Last:{" "}
                {live?.last_seen
                  ? new Date(live.last_seen).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })
                  : "—"}
              </span>
              <span>
                Az:{" "}
                {live?.azimuth_deg != null
                  ? `${live.azimuth_deg.toFixed(1)}°`
                  : "—"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
