"use client";

/**
 * Detections list — same behaviour as old-ui DetectionsPanel: group live tracks
 * by detecting radar, show position state (reported / derived / unknown).
 * Styling uses driifTokens (colours map old-ui slate/cyan/amber intent).
 */

import { useMemo, type ReactNode } from "react";
import type { Device } from "@/types/aeroshield";
import type { Target } from "@/types/targets";
import { useTargetsStore } from "@/stores/targetsStore";
import { COLOR, FONT, RADIUS } from "@/styles/driifTokens";

const STALE_MS = 30_000;

type DeviceLite = Pick<Device, "id" | "name" | "monitor_device_id">;

function buildDeviceIndex(devices: DeviceLite[] | undefined) {
  const byId = new Map<string, DeviceLite>();
  const byMon = new Map<number, DeviceLite>();
  for (const d of devices ?? []) {
    if (d.id) byId.set(d.id, d);
    if (typeof d.monitor_device_id === "number") {
      byMon.set(d.monitor_device_id, d);
    }
  }
  return { byId, byMon };
}

export function MissionDetectionsList({
  devices,
  /** Tighter padding when embedded in another scroll region. */
  compact = false,
}: {
  devices: Device[] | undefined;
  compact?: boolean;
}) {
  const targets = useTargetsStore((s) => s.targets);

  const devIndex = useMemo(() => buildDeviceIndex(devices), [devices]);

  const grouped = useMemo(() => {
    type Group = { key: string; radarLabel: string; tracks: Target[] };
    const m = new Map<string, Group>();
    const now = Date.now();

    for (const t of targets) {
      if (t.lost) continue;
      const lastMs = t.lastSeenAt ?? now;
      if (now - lastMs > STALE_MS) continue;

      const dev = t.deviceId
        ? devIndex.byId.get(t.deviceId)
        : typeof t.monitorDeviceId === "number"
          ? devIndex.byMon.get(t.monitorDeviceId)
          : undefined;

      const key =
        dev?.id ??
        (typeof t.monitorDeviceId === "number"
          ? `mon:${t.monitorDeviceId}`
          : "unattributed");
      const radarLabel =
        dev?.name ??
        (typeof t.monitorDeviceId === "number"
          ? `monitor_id=${t.monitorDeviceId}`
          : "Unattributed");

      let g = m.get(key);
      if (!g) {
        g = { key, radarLabel, tracks: [] };
        m.set(key, g);
      }
      g.tracks.push(t);
    }
    return Array.from(m.values()).sort((a, b) =>
      a.radarLabel.localeCompare(b.radarLabel),
    );
  }, [targets, devIndex]);

  const total = grouped.reduce((n, g) => n + g.tracks.length, 0);

  const pad = compact ? "8px" : "12px";

  return (
    <div
      style={{
        padding: pad,
        color: COLOR.missionsBodyText,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <div
        className="mb-2 flex items-center justify-between"
        style={{ marginBottom: "8px" }}
      >
        <div
          style={{
            fontSize: FONT.sizeSm,
            fontWeight: FONT.weightBold,
            letterSpacing: "0.02em",
            color: COLOR.missionsBodyText,
          }}
        >
          Detections
          <span
            style={{
              marginLeft: "8px",
              fontSize: FONT.sizeXs,
              fontWeight: FONT.weightNormal,
              color: COLOR.missionsSecondaryText,
            }}
          >
            {total} active · {grouped.length} radar{grouped.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {grouped.length === 0 && (
        <div
          style={{
            fontSize: FONT.sizeXs,
            fontStyle: "italic",
            color: COLOR.missionsSecondaryText,
          }}
        >
          No active drone tracks. The list will populate as radars detect
          drones.
        </div>
      )}

      <div
        className="driif-mission-scrollbar space-y-3 overflow-auto"
        style={{ maxHeight: compact ? "min(560px, 55vh)" : "min(640px, 65vh)" }}
      >
        {grouped.map((g) => (
          <div
            key={g.key}
            style={{
              borderRadius: RADIUS.fencePopover,
              border: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
              background: COLOR.missionsCardBg,
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-center justify-between px-2 py-1.5"
              style={{
                background: COLOR.missionCreateFieldBg,
                fontSize: "11px",
                fontWeight: FONT.weightBold,
                color: COLOR.missionsBodyText,
              }}
            >
              <span className="truncate">{g.radarLabel}</span>
              <span style={{ color: COLOR.missionsSecondaryText }}>
                {g.tracks.length} track{g.tracks.length === 1 ? "" : "s"}
              </span>
            </div>
            <table className="w-full" style={{ fontSize: "11px" }}>
              <thead>
                <tr
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: COLOR.missionsSecondaryText,
                    fontSize: "10px",
                  }}
                >
                  <th className="px-2 py-1 text-left font-bold">Drone</th>
                  <th className="px-2 py-1 text-left font-bold">Position</th>
                  <th className="px-2 py-1 text-right font-bold">Conf</th>
                  <th className="px-2 py-1 text-right font-bold">Seen</th>
                </tr>
              </thead>
              <tbody>
                {g.tracks.map((t) => {
                  const [lon, lat] = t.coordinates;
                  const hasPos =
                    Number.isFinite(lon) &&
                    Number.isFinite(lat) &&
                    !(lat === 0 && lon === 0);
                  const lastMs = t.lastSeenAt ?? Date.now();
                  const ageMs = Date.now() - lastMs;
                  const ageLabel =
                    !Number.isFinite(ageMs)
                      ? "—"
                      : ageMs < 1000
                        ? "now"
                        : ageMs < 60_000
                          ? `${Math.round(ageMs / 1000)}s ago`
                          : `${Math.round(ageMs / 60_000)}m ago`;

                  let posNode: ReactNode;
                  if (!hasPos) {
                    posNode = (
                      <span
                        className="inline-block rounded px-1.5 py-0.5"
                        style={{
                          fontSize: "10px",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#fca5a5",
                          boxShadow: `0 0 0 1px rgba(239, 68, 68, 0.25)`,
                        }}
                        title="No lat/lon available. Radar did not report coordinates and they could not be derived."
                      >
                        unknown
                      </span>
                    );
                  } else if (t.positionDerived) {
                    posNode = (
                      <span
                        className="font-mono"
                        style={{ color: "#fbbf24" }}
                        title="Position was derived from radar location, distance, and azimuth. Verify the radar position on the Devices page."
                      >
                        {lat.toFixed(5)}, {lon.toFixed(5)}
                        <span
                          className="ml-1 inline-block rounded px-1 text-[10px]"
                          style={{
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#fef3c7",
                          }}
                        >
                          derived
                        </span>
                      </span>
                    );
                  } else {
                    posNode = (
                      <span
                        className="font-mono"
                        style={{ color: COLOR.missionsBodyText }}
                        title="Position reported by the radar."
                      >
                        {lat.toFixed(5)}, {lon.toFixed(5)}
                      </span>
                    );
                  }

                  const nameNode = (
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate">
                        {t.targetName || t.id.slice(0, 12)}
                      </span>
                      {t.targetUidSynthesised && (
                        <span
                          className="shrink-0 rounded px-1 text-[9px]"
                          style={{
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#fef3c7",
                            boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.2)",
                          }}
                          title="target_uid was empty; backend synthesised a stable id."
                        >
                          syn-uid
                        </span>
                      )}
                    </div>
                  );

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#4a4a4a]"
                      style={{
                        borderTop: `1px solid ${COLOR.missionCreateSummaryModalBorder}`,
                      }}
                    >
                      <td className="px-2 py-1 align-top">{nameNode}</td>
                      <td className="px-2 py-1 align-top">{posNode}</td>
                      <td
                        className="px-2 py-1 text-right font-mono align-top"
                        style={{ color: COLOR.missionCreateFieldText }}
                      >
                        {t.confidence != null ? `${t.confidence}%` : "—"}
                      </td>
                      <td
                        className="px-2 py-1 text-right align-top"
                        style={{ color: COLOR.missionsSecondaryText }}
                      >
                        {ageLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div
        className="mt-3 flex flex-wrap items-center gap-3 border-t border-solid pt-2"
        style={{
          borderColor: COLOR.missionCreateSummaryModalBorder,
          fontSize: "10px",
          color: COLOR.missionsSecondaryText,
        }}
      >
        <span>
          <span
            className="mr-1 font-mono"
            style={{ color: COLOR.missionsBodyText }}
          >
            0.0,0.0
          </span>{" "}
          reported
        </span>
        <span>
          <span
            className="mr-1 font-mono"
            style={{ color: "#fbbf24" }}
          >
            0.0,0.0
          </span>
          <span
            className="mr-1 inline-block rounded px-1 text-[9px]"
            style={{
              background: "rgba(245, 158, 11, 0.2)",
              color: "#fef3c7",
            }}
          >
            derived
          </span>
        </span>
        <span>
          <span
            className="inline-block rounded px-1.5 py-0.5 text-[9px]"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              color: "#fca5a5",
              boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.25)",
            }}
          >
            unknown
          </span>
        </span>
      </div>
    </div>
  );
}
