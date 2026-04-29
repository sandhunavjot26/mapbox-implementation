"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Device } from "@/types/aeroshield";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useAuthStore } from "@/stores/authStore";
import { listMissionCommandsAudit } from "@/lib/api/commands";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import { jammerStateByDevice, type JammerState } from "@/utils/jammerStateByDevice";
import {
  assessDeviceHealth,
  healthBannerSurface,
  healthPillSurface,
  mergedDeviceStateForUi,
  relativeTimeShort,
} from "@/utils/deviceHealth";
import { MissionDeviceAimControls } from "@/components/missions/MissionDeviceAimControls";
import { MissionDeviceDiagnostics } from "@/components/missions/MissionDeviceDiagnostics";
import { MissionDeviceLiveStateGrid } from "@/components/missions/MissionDeviceLiveStateGrid";

function deviceHasBeam(d: Device): boolean {
  const det = d.detection_radius_m != null && Number(d.detection_radius_m) > 0;
  const jam = d.jammer_radius_m != null && Number(d.jammer_radius_m) > 0;
  return det || jam;
}

function DeviceGlyph({ type }: { type?: string }) {
  const t = (type || "DETECTION").toUpperCase();
  const jammer = t.includes("JAMMER");
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{
        background: jammer ? "rgba(245, 158, 11, 0.2)" : "rgba(6, 182, 212, 0.15)",
        border: `1px solid ${jammer ? "rgba(245, 158, 11, 0.55)" : "rgba(6, 182, 212, 0.45)"}`,
        color: jammer ? "#fcd34d" : "#7dd3fc",
      }}
    >
      {jammer ? "JAM" : "RDR"}
    </div>
  );
}

export function MissionDevicesTab({
  devices,
  missionId,
}: {
  devices: Device[] | undefined;
  missionId: string | null | undefined;
}) {
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);
  const canRequestCommand = useAuthStore((s) => s.hasPermission("command:request"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jammerByDevice, setJammerByDevice] = useState<Record<string, JammerState>>({});
  /** Recompute heartbeat-based health on an interval */
  const [healthTick, setHealthTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHealthTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const list = devices ?? [];
  const selected = useMemo(
    () => list.find((d) => d.id === selectedId) ?? list[0],
    [list, selectedId],
  );

  useEffect(() => {
    if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
  }, [list, selectedId]);

  const refreshJammer = useCallback(async () => {
    if (!missionId) return;
    try {
      const rows = await listMissionCommandsAudit(missionId, {
        since_minutes: 60,
        limit: 500,
      });
      const relevant = rows.filter((r) =>
        ["JAM_START", "JAM_STOP", "ATTACK_MODE_SET"].includes(r.command_type),
      );
      setJammerByDevice(jammerStateByDevice(relevant));
    } catch {
      /* keep previous */
    }
  }, [missionId]);

  useEffect(() => {
    if (!missionId) return;
    void refreshJammer();
    const t = setInterval(() => void refreshJammer(), 5000);
    return () => clearInterval(t);
  }, [missionId, refreshJammer]);

  const attentionCount = useMemo(() => {
    void healthTick;
    let n = 0;
    for (const d of list) {
      const live = byDeviceId[d.id];
      const st = mergedDeviceStateForUi(d, live);
      if (assessDeviceHealth(d, st).status !== "ONLINE") n += 1;
    }
    return n;
  }, [list, byDeviceId, healthTick]);

  if (!list.length) {
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

  const live = selected ? byDeviceId[selected.id] : undefined;
  const mergedState = selected ? mergedDeviceStateForUi(selected, live) : {};
  const health = selected ? assessDeviceHealth(selected, mergedState) : null;
  const healthPill = health ? healthPillSurface(health.status) : healthPillSurface("OFFLINE");
  const jamState = selected ? jammerByDevice[selected.id] ?? "UNKNOWN" : "UNKNOWN";
  const commandsDisabled = !missionId || !canRequestCommand;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div
          style={{
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeSm,
            fontWeight: FONT.weightMedium,
            color: COLOR.missionsBodyText,
          }}
        >
          Devices
          <span style={{ marginLeft: "8px", color: COLOR.missionsSecondaryText, fontWeight: FONT.weightNormal }}>
            {list.length}
          </span>
        </div>
        {attentionCount > 0 && (
          <span
            className="rounded px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: "rgba(245, 158, 11, 0.18)",
              color: "#fde68a",
              border: "1px solid rgba(245, 158, 11, 0.4)",
            }}
            title={`${attentionCount} device${attentionCount === 1 ? "" : "s"} need attention`}
          >
            {attentionCount} need attention
          </span>
        )}
      </div>

      <ul
        className="driif-mission-scrollbar m-0 flex list-none flex-col gap-2 overflow-y-auto p-0"
        style={{ maxHeight: "min(40vh, 300px)" }}
      >
        {list.map((d) => {
          void healthTick;
          const rowLive = byDeviceId[d.id];
          const rowMerged = mergedDeviceStateForUi(d, rowLive);
          const rowHealth = assessDeviceHealth(d, rowMerged);
          const rowPill = healthPillSurface(rowHealth.status);
          const isSel = selected?.id === d.id;
          const jt = (d.device_type || "").toUpperCase();
          const jamChip =
            (jt === "JAMMER" || jt === "DETECTION_JAMMER") &&
            jammerByDevice[d.id] === "ON";
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setSelectedId(d.id)}
                className="w-full text-left transition-opacity hover:opacity-95"
                style={{
                  background: isSel ? "rgba(6, 182, 212, 0.12)" : COLOR.missionsCardBg,
                  border: `1px solid ${isSel ? "rgba(6, 182, 212, 0.45)" : COLOR.border}`,
                  borderRadius: RADIUS.panel,
                  padding: `${SPACING.missionCreateListItemPadY} ${SPACING.missionCreateListItemPadX}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    gap: "10px",
                  }}
                >
                  <DeviceGlyph type={d.device_type} />
                  <div style={{ minWidth: 0, flex: 1 }}>
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
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {jamChip && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: FONT.weightMedium,
                              letterSpacing: "0.04em",
                              padding: "2px 6px",
                              borderRadius: RADIUS.panel,
                              background: "rgba(245, 158, 11, 0.2)",
                              color: "#fde68a",
                              border: "1px solid rgba(245, 158, 11, 0.45)",
                            }}
                          >
                            JAM
                          </span>
                        )}
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: RADIUS.panel,
                            background: rowPill.bg,
                            color: rowPill.fg,
                            border: rowPill.border,
                            fontSize: FONT.sizeXs,
                            fontWeight: FONT.weightMedium,
                          }}
                        >
                          {rowPill.label}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "8px 12px",
                        fontFamily: `${FONT.mono}, monospace`,
                        fontSize: FONT.sizeXs,
                        color: COLOR.missionsSecondaryText,
                      }}
                    >
                      <span>
                        Last seen{" "}
                        {rowLive?.last_seen ? relativeTimeShort(rowLive.last_seen) : "—"}
                      </span>
                      {rowLive?.azimuth_deg != null && (
                        <span>Az {rowLive.azimuth_deg.toFixed(0)}°</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && missionId && (
        <div
          style={{
            background: COLOR.missionsCardBg,
            border: `1px solid ${COLOR.border}`,
            borderRadius: RADIUS.panel,
            padding: SPACING.missionWorkspacePadX,
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              style={{
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeXs,
                fontWeight: FONT.weightMedium,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: COLOR.missionsSecondaryText,
              }}
            >
              Live state · {selected.name || selected.serial_number}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: RADIUS.panel,
                background: healthPill.bg,
                color: healthPill.fg,
                border: healthPill.border,
                fontSize: FONT.sizeXs,
                fontWeight: FONT.weightMedium,
              }}
            >
              {healthPill.label}
            </span>
          </div>

          {health && health.status !== "ONLINE" && (
            <div
              className="mb-3 rounded-md px-3 py-2"
              style={healthBannerSurface(health.status)}
            >
              <div
                style={{
                  fontSize: FONT.sizeXs,
                  fontWeight: FONT.weightMedium,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                {healthPill.label} · what to do
              </div>
              {health.reasons.length > 0 && (
                <ul
                  style={{
                    margin: "0 0 8px 0",
                    paddingLeft: "18px",
                    fontSize: FONT.sizeXs,
                    lineHeight: 1.45,
                  }}
                >
                  {health.reasons.map((r, i) => (
                    <li key={`r-${i}`}>{r}</li>
                  ))}
                </ul>
              )}
              {health.actionPlan.length > 0 && (
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    fontSize: FONT.sizeXs,
                    lineHeight: 1.45,
                  }}
                >
                  {health.actionPlan.map((a, i) => (
                    <li key={`a-${i}`}>{a}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <MissionDeviceLiveStateGrid state={mergedState} />

          {!canRequestCommand && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: FONT.sizeXs,
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
              }}
            >
              You don’t have permission to send commands.
            </p>
          )}

          {deviceHasBeam(selected) ? (
            <MissionDeviceAimControls
              device={selected}
              missionId={missionId}
              liveAzimuthDeg={live?.azimuth_deg}
              liveElevationDeg={live?.elevation_deg}
              jammerState={jamState}
              commandsDisabled={commandsDisabled}
            />
          ) : (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: FONT.sizeSm,
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
              }}
            >
              Aim controls apply when this device has detection or jammer range configured.
            </p>
          )}

          <MissionDeviceDiagnostics
            missionId={missionId}
            deviceId={selected.id}
            disabled={commandsDisabled}
          />

          <details style={{ marginTop: "10px" }}>
            <summary
              style={{
                cursor: "pointer",
                fontSize: FONT.sizeXs,
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
              }}
            >
              Raw device status (debug)
            </summary>
            <pre
              className="mt-1 max-h-40 overflow-auto font-mono text-[10px]"
              style={{ color: COLOR.missionsSecondaryText }}
            >
              {JSON.stringify(live ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {selected && !missionId && (
        <p
          style={{
            margin: 0,
            fontSize: FONT.sizeSm,
            color: COLOR.missionsSecondaryText,
            fontFamily: `${FONT.family}, sans-serif`,
          }}
        >
          Select a mission to control devices.
        </p>
      )}
    </div>
  );
}
