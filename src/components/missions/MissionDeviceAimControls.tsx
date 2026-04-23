"use client";

import { useCallback, useEffect, useState } from "react";
import type { Device } from "@/types/aeroshield";
import { createCommand } from "@/lib/api/commands";
import { ApiClientError } from "@/lib/api/client";
import { formatCommandError } from "@/lib/formatCommandError";
import { useCommandsStore } from "@/stores/commandsStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useToast } from "@/components/alerts/useToast";
import {
  clampElevationDeg,
  normalizeBearingDeg,
} from "@/types/radarMissionDraft";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";
import { formatBearingDegreesAndCardinalParts } from "@/utils/bearingFormat";
import { RADAR_PAD_ARROW_SRC } from "@/components/missions/configureRadar/radarPadArrowSrc";
import type { JammerState } from "@/utils/jammerStateByDevice";
import {
  DPAD_ICON_PX,
  DPAD_PX,
  PAD_BEARINGS,
  PAD_DIRS,
  padCellShell,
  PitchElevationGauge,
  PitchElevationSlider,
  PitchNudgeImg,
} from "@/components/missions/configureRadar/radarAimUi";

function clampBearingDeg(n: number): number {
  return Math.max(0, Math.min(360, Math.round(n)));
}

function parseApiDetailObject(err: unknown): Record<string, unknown> | null {
  if (!(err instanceof ApiClientError)) return null;
  try {
    const o = JSON.parse(err.message) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return null;
}

function trackCommand(out: {
  id: string;
  mission_id: string;
  device_id: string | null;
  command_type: string;
  status: string;
  approved_count?: number;
  required_approvals?: number;
  last_error?: string | null;
  packet_no?: number | null;
}) {
  useCommandsStore.getState().addOrUpdateCommand({
    id: out.id,
    mission_id: out.mission_id,
    device_id: out.device_id,
    command_type: out.command_type,
    status: out.status,
    approved_count: out.approved_count,
    required_approvals: out.required_approvals,
    last_error: out.last_error,
    packet_no: out.packet_no ?? undefined,
    created_at: new Date().toISOString(),
  });
}

function jamCapable(d: Device): boolean {
  const t = (d.device_type || "").toUpperCase();
  return t === "JAMMER" || t === "DETECTION_JAMMER";
}

export function MissionDeviceAimControls({
  device,
  missionId,
  liveAzimuthDeg,
  liveElevationDeg,
  jammerState,
  commandsDisabled,
}: {
  device: Device;
  missionId: string;
  liveAzimuthDeg: number | null | undefined;
  liveElevationDeg: number | null | undefined;
  jammerState: JammerState;
  commandsDisabled: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [bearingDeg, setBearingDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);

  useEffect(() => {
    if (liveAzimuthDeg != null && Number.isFinite(Number(liveAzimuthDeg))) {
      setBearingDeg(normalizeBearingDeg(Number(liveAzimuthDeg)));
    }
  }, [liveAzimuthDeg, device.id]);

  useEffect(() => {
    if (liveElevationDeg != null && Number.isFinite(Number(liveElevationDeg))) {
      setPitchDeg(clampElevationDeg(Number(liveElevationDeg)));
    }
  }, [liveElevationDeg, device.id]);

  const bearingParts = formatBearingDegreesAndCardinalParts(bearingDeg);
  const roundedBearing = Math.round(normalizeBearingDeg(bearingDeg));
  const elev = clampElevationDeg(pitchDeg);
  const elevRounded = Math.round(elev);
  const elevSign = elevRounded > 0 ? "+" : elevRounded < 0 ? "−" : "";

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (commandsDisabled || busy) return;
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    },
    [busy, commandsDisabled],
  );

  const fireTurntablePoint = async (opts: {
    hEnable: boolean;
    horizontal: number;
    vEnable: boolean;
    vertical: number;
  }) => {
    const horiz = clampBearingDeg(opts.horizontal);
    const vert = clampElevationDeg(Math.round(opts.vertical));
    const out = await createCommand({
      mission_id: missionId,
      device_id: device.id,
      command_type: "TURNTABLE_POINT",
      payload: {
        h_enable: opts.hEnable ? 1 : 0,
        horizontal: opts.hEnable ? horiz : 0,
        v_enable: opts.vEnable ? 1 : 0,
        vertical: opts.vEnable ? vert : 0,
      },
    });
    trackCommand(out);
    if (opts.hEnable) {
      useDeviceStatusStore.getState().updateDeviceAzimuth(device.id, {
        azimuth_deg: horiz,
        elevation_deg: opts.vEnable ? vert : undefined,
        monitor_device_id: device.monitor_device_id,
      });
    } else if (opts.vEnable) {
      const curAz =
        useDeviceStatusStore.getState().byDeviceId[device.id]?.azimuth_deg ??
        normalizeBearingDeg(bearingDeg);
      useDeviceStatusStore.getState().updateDeviceAzimuth(device.id, {
        azimuth_deg: curAz,
        elevation_deg: vert,
        monitor_device_id: device.monitor_device_id,
      });
    }
    const label =
      opts.hEnable && opts.vEnable
        ? `Turntable → ${horiz}° / pitch ${vert >= 0 ? "+" : ""}${vert}°`
        : opts.hEnable
          ? `Turntable → ${horiz}°`
          : `Pitch → ${vert >= 0 ? "+" : ""}${vert}°`;
    toast.success(label);
  };

  const fireTurntableStop = async () => {
    const out = await createCommand({
      mission_id: missionId,
      device_id: device.id,
      command_type: "TURNTABLE_DIR",
      payload: { direction: 0, speed: 0 },
    });
    trackCommand(out);
    toast.info("Turntable stop sent");
  };

  const onPadCell = (cell: number | "stop") => {
    void run(async () => {
      if (cell === "stop") {
        await fireTurntableStop();
        return;
      }
      setBearingDeg(normalizeBearingDeg(cell));
      await fireTurntablePoint({
        hEnable: true,
        horizontal: cell,
        vEnable: false,
        vertical: 0,
      });
    });
  };

  const applyFineBearing = () => {
    void run(async () => {
      await fireTurntablePoint({
        hEnable: true,
        horizontal: roundedBearing,
        vEnable: false,
        vertical: 0,
      });
    });
  };

  const firePitchOnly = async (vertical: number) => {
    const vert = clampElevationDeg(Math.round(vertical));
    setPitchDeg(vert);
    const out = await createCommand({
      mission_id: missionId,
      device_id: device.id,
      command_type: "TURNTABLE_POINT",
      payload: {
        h_enable: 0,
        horizontal: 0,
        v_enable: 1,
        vertical: vert,
      },
    });
    trackCommand(out);
    const curAz =
      useDeviceStatusStore.getState().byDeviceId[device.id]?.azimuth_deg ??
      normalizeBearingDeg(bearingDeg);
    useDeviceStatusStore.getState().updateDeviceAzimuth(device.id, {
      azimuth_deg: curAz,
      elevation_deg: vert,
      monitor_device_id: device.monitor_device_id,
    });
    toast.success(`Pitch → ${vert >= 0 ? "+" : ""}${vert}°`);
  };

  const nudgePitch = (delta: number) => {
    void run(async () => {
      await firePitchOnly(pitchDeg + delta);
    });
  };

  const onPitchSliderCommit = () => {
    void run(async () => {
      await firePitchOnly(pitchDeg);
    });
  };

  const fireJam = async (on: boolean, overrideFriendly?: boolean) => {
    const commandType = on ? "JAM_START" : "JAM_STOP";
    const basePayload: Record<string, unknown> = { mode: 1, switch: on ? 1 : 0 };
    if (overrideFriendly) basePayload.override_friendly = true;
    try {
      const out = await createCommand({
        mission_id: missionId,
        device_id: device.id,
        command_type: commandType,
        payload: basePayload,
      });
      trackCommand(out);
      toast.success(on ? "Jammer ON" : "Jammer OFF");
    } catch (e) {
      const d = parseApiDetailObject(e);
      if (
        e instanceof ApiClientError &&
        e.status === 409 &&
        d?.error === "friendly_drone_active"
      ) {
        const friendlies = Array.isArray(d.friendlies) ? d.friendlies : [];
        const names = friendlies
          .map((f: unknown) => {
            if (f && typeof f === "object") {
              const o = f as { label?: string; band?: string };
              return `${o.label ?? "?"}${o.band ? ` (${o.band})` : ""}`;
            }
            return "";
          })
          .filter(Boolean)
          .join(", ");
        const ok =
          typeof window !== "undefined" &&
          window.confirm(
            `Friendly drone active: ${names || "restricted band"}. Override and ${on ? "jam" : "stop"}?`,
          );
        if (ok) {
          try {
            const out2 = await createCommand({
              mission_id: missionId,
              device_id: device.id,
              command_type: commandType,
              payload: { ...basePayload, override_friendly: true },
            });
            trackCommand(out2);
            toast.success(`${commandType} sent (friendly override)`);
          } catch (e2) {
            toast.error(formatCommandError(e2));
          }
        } else toast.info("Jam cancelled — friendly lockout.");
        return;
      }
      if (d?.error === "command_not_valid_for_device_type") {
        toast.error("This device type cannot use jam commands.");
        return;
      }
      toast.error(formatCommandError(e));
    }
  };

  const fireAttackMode = async (mode: 0 | 1, switchOn: 0 | 1) => {
    try {
      const out = await createCommand({
        mission_id: missionId,
        device_id: device.id,
        command_type: "ATTACK_MODE_SET",
        payload: { mode, switch: switchOn },
      });
      trackCommand(out);
      const modeLabel = mode === 1 ? "Attack" : "Passive";
      const switchLabel = switchOn === 1 ? "ON" : "OFF";
      toast.success(`Attack mode → ${modeLabel} / ${switchLabel}`);
    } catch (e) {
      toast.error(formatCommandError(e));
    }
  };

  const fieldShellStyle = {
    background: COLOR.missionCreateFieldBg,
    borderColor: COLOR.missionCreateFieldBorder,
    borderWidth: 1,
    borderStyle: "solid" as const,
  };

  const fieldTextStyle = {
    color: COLOR.missionCreateFieldText,
    fontFamily: `${FONT.family}, sans-serif`,
  } as const;

  return (
    <div
      className="flex flex-col"
      style={{ gap: SPACING.missionCreateFormSectionGap, marginTop: "12px" }}
    >
      <div
        className="grid w-full min-w-0"
        style={{
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: SPACING.missionCreateStackGapMd,
        }}
      >
        <div className="flex min-w-0 flex-col" style={{ gap: SPACING.missionCreateBlockGapSm }}>
          <span
            style={{
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              fontSize: FONT.sizeSm,
              lineHeight: "17px",
            }}
          >
            Fine-tune bearing (0°–360°)
          </span>
          <div className="flex min-w-0 gap-2">
            <label
              className="flex min-w-0 flex-1 items-center overflow-hidden px-3"
              style={{
                ...fieldShellStyle,
                minHeight: SPACING.missionCreateFieldRowHeight,
                borderRadius: RADIUS.panel,
              }}
            >
              <input
                type="number"
                min={0}
                max={360}
                step={1}
                value={roundedBearing}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setBearingDeg(normalizeBearingDeg(v));
                }}
                disabled={commandsDisabled || busy}
                className="w-full min-w-0 border-0 bg-transparent py-0 outline-none disabled:opacity-50"
                style={{
                  ...fieldTextStyle,
                  fontSize: FONT.sizeMd,
                  lineHeight: "21px",
                }}
                aria-label="Fine-tune bearing in degrees"
              />
            </label>
            <button
              type="button"
              disabled={commandsDisabled || busy}
              onClick={applyFineBearing}
              className="shrink-0 rounded border px-3 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                borderColor: COLOR.missionCreateFieldBorder,
                background: COLOR.missionCreateFieldBorder,
                color: COLOR.missionsBodyText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeSm,
                minHeight: SPACING.missionCreateFieldRowHeight,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex min-w-0 flex-col min-[480px]:flex-row"
        style={{
          gap: SPACING.missionCreateStackGapMd,
          rowGap: "24px",
          alignItems: "flex-start",
        }}
      >
        <div
          className="flex shrink-0 flex-col items-center"
          style={{
            gap: SPACING.missionCreateStackGapMd,
            width: "200px",
            maxWidth: "100%",
            alignSelf: "center",
          }}
        >
          <div
            className="grid shrink-0"
            style={{
              width: DPAD_PX,
              height: DPAD_PX,
              gap: "2px",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
            }}
          >
            {PAD_BEARINGS.map((cell, i) => {
              const dir = PAD_DIRS[i];
              const activeArrow =
                typeof cell === "number" && roundedBearing === Math.round(cell);

              if (cell === "stop" || dir === "stop") {
                return (
                  <button
                    key={`pad-stop-${i}`}
                    type="button"
                    disabled={commandsDisabled || busy}
                    onClick={() => onPadCell("stop")}
                    className="border-0 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                    style={padCellShell(false)}
                    aria-label="Stop turntable slew"
                  >
                    <span
                      style={{
                        color: COLOR.missionsBodyText,
                        fontFamily: `${FONT.family}, sans-serif`,
                        fontSize: FONT.sizeXs,
                        fontWeight: FONT.weightNormal,
                        lineHeight: "15px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Stop
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={`pad-${i}-${cell}`}
                  type="button"
                  disabled={commandsDisabled || busy}
                  onClick={() => onPadCell(cell)}
                  className="border-0 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  style={padCellShell(activeArrow)}
                  aria-label={`Point to ${cell} degrees`}
                >
                  <img
                    src={RADAR_PAD_ARROW_SRC[dir]}
                    alt=""
                    width={DPAD_ICON_PX}
                    height={DPAD_ICON_PX}
                    draggable={false}
                    style={{
                      display: "block",
                      flexShrink: 0,
                      maxWidth: "none",
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div
            className="flex flex-col items-center"
            style={{ gap: SPACING.missionCreateBlockGapMd }}
          >
            <span
              className="w-full text-center"
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeSm,
                lineHeight: "17px",
              }}
            >
              Horizontal bearing
            </span>
            <div className="flex w-full flex-col items-stretch" style={{ gap: "4px" }}>
              <span
                className="w-full text-center tabular-nums"
                style={{
                  color: COLOR.missionReviewChecklistHeading,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: "21px",
                  fontWeight: FONT.weightMedium,
                  lineHeight: "24px",
                }}
              >
                {bearingParts.degrees}
              </span>
              <span
                className="w-full text-center"
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  fontWeight: FONT.weightNormal,
                  lineHeight: "17px",
                }}
              >
                {bearingParts.cardinal}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: SPACING.missionCreateStackGapMd, minWidth: 0 }}
        >
          <div
            className="flex w-full min-w-0 flex-row flex-wrap items-center"
            style={{ gap: "6px", justifyContent: "flex-end" }}
          >
            <div className="flex shrink-0 flex-col items-center" style={{ width: "88px" }}>
              <div className="w-full" style={{ maxWidth: "88px" }}>
                <PitchElevationGauge elevationDeg={pitchDeg} />
              </div>
            </div>
            <div
              className="flex shrink-0 flex-col"
              style={{ gap: SPACING.missionCreateStackGapMd }}
            >
              <div
                className="flex w-full min-w-0 flex-col items-center"
                style={{ gap: SPACING.missionCreateStackGapMd }}
              >
                <div
                  className="flex w-full min-w-0 flex-wrap items-end justify-center"
                  style={{ gap: "4px", rowGap: "2px", lineHeight: "17px" }}
                >
                  <span
                    className="shrink-0 tabular-nums"
                    style={{
                      color: COLOR.missionReviewChecklistHeading,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: "21px",
                      fontWeight: FONT.weightMedium,
                    }}
                  >
                    {elevRounded === 0
                      ? "0°"
                      : `${elevSign}${Math.abs(elevRounded)}°`}
                  </span>
                  <span
                    className="min-w-0 shrink text-center"
                    style={{
                      color: COLOR.missionsSecondaryText,
                      fontFamily: `${FONT.family}, sans-serif`,
                      fontSize: FONT.sizeSm,
                      fontWeight: FONT.weightNormal,
                    }}
                  >
                    elevation
                  </span>
                </div>
                <div
                  className="flex w-full items-center justify-center"
                  style={{ gap: "4px" }}
                >
                  <PitchNudgeImg
                    src="/icons/ArrowDown.svg"
                    label="Decrease pitch five degrees"
                    onClick={() => nudgePitch(-5)}
                    disabled={commandsDisabled || busy}
                  />
                  <PitchNudgeImg
                    src="/icons/ArrowLeft.svg"
                    label="Decrease pitch one degree"
                    onClick={() => nudgePitch(-1)}
                    disabled={commandsDisabled || busy}
                  />
                  <PitchNudgeImg
                    src="/icons/ArrowRight.svg"
                    label="Increase pitch one degree"
                    onClick={() => nudgePitch(1)}
                    disabled={commandsDisabled || busy}
                  />
                  <PitchNudgeImg
                    src="/icons/ArrowUp.svg"
                    label="Increase pitch five degrees"
                    onClick={() => nudgePitch(5)}
                    disabled={commandsDisabled || busy}
                  />
                </div>
              </div>
              <p
                className="m-0 w-full text-center"
                style={{
                  color: COLOR.missionsSecondaryText,
                  fontFamily: `${FONT.family}, sans-serif`,
                  fontSize: FONT.sizeSm,
                  lineHeight: "17px",
                }}
              >
                Pitch (vertical tilt)
              </p>
            </div>
          </div>

          <div
            className="flex min-w-0 flex-col"
            style={{
              gap: "6px",
              width: "82%",
              maxWidth: "220px",
              marginLeft: "auto",
            }}
          >
            <div onPointerUp={() => !commandsDisabled && !busy && onPitchSliderCommit()}>
              <PitchElevationSlider
                value={pitchDeg}
                onChange={(v) => setPitchDeg(v)}
              />
            </div>
            <div
              className="flex w-full justify-between"
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeSm,
                lineHeight: "17px",
              }}
            >
              <span>−40°</span>
              <span>0°</span>
              <span>+90°</span>
            </div>
          </div>
        </div>
      </div>

      {jamCapable(device) && (
        <div
          className="flex flex-col gap-3 border-t pt-3"
          style={{ borderColor: COLOR.border }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              style={{
                color: COLOR.missionsSecondaryText,
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeXs,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Engage
            </span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={
                jammerState === "ON"
                  ? {
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#fde68a",
                      border: "1px solid rgba(245, 158, 11, 0.45)",
                    }
                  : jammerState === "OFF"
                    ? {
                        background: COLOR.missionsCardBg,
                        color: COLOR.missionsSecondaryText,
                        border: `1px solid ${COLOR.border}`,
                      }
                    : {
                        background: COLOR.missionsCardBg,
                        color: COLOR.missionsSecondaryText,
                        border: `1px dashed ${COLOR.border}`,
                      }
              }
            >
              Jammer {jammerState === "UNKNOWN" ? "?" : jammerState}
            </span>
          </div>

          <div className="flex w-full min-w-0 gap-3">
            <button
              type="button"
              disabled={commandsDisabled || busy}
              onClick={() => void run(async () => {
                await fireJam(true);
              })}
              className="min-h-[44px] flex-1 rounded-md border-2 font-semibold transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                borderColor: "rgba(220, 38, 38, 0.65)",
                background: "rgba(220, 38, 38, 0.22)",
                color: "#fecaca",
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
              }}
            >
              JAM
            </button>
            <button
              type="button"
              disabled={commandsDisabled || busy}
              onClick={() => void run(async () => {
                await fireJam(false);
              })}
              className="min-h-[44px] flex-1 rounded-md border-2 font-semibold transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                borderColor: "rgba(248, 250, 252, 0.35)",
                background: "rgba(248, 250, 252, 0.08)",
                color: "#f8fafc",
                fontFamily: `${FONT.family}, sans-serif`,
                fontSize: FONT.sizeMd,
              }}
            >
              STOP
            </button>
          </div>
          <p
            className="m-0"
            style={{
              fontSize: FONT.sizeXs,
              color: COLOR.missionsSecondaryText,
              fontFamily: `${FONT.family}, sans-serif`,
              lineHeight: 1.4,
            }}
          >
            Aim the turntable first — detection and jam share the same bearing on this radar.
          </p>
          <AttackModeRow
            disabled={commandsDisabled || busy}
            onSend={(mode, sw) =>
              void run(async () => {
                await fireAttackMode(mode, sw);
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function AttackModeRow({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (mode: 0 | 1, sw: 0 | 1) => void;
}) {
  const [mode, setMode] = useState<0 | 1>(1);
  const [sw, setSw] = useState<0 | 1>(1);
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ fontFamily: `${FONT.family}, sans-serif`, fontSize: FONT.sizeSm }}
    >
      <span style={{ color: COLOR.missionsSecondaryText }}>Attack mode</span>
      <select
        value={mode}
        disabled={disabled}
        onChange={(e) => setMode(Number(e.target.value) as 0 | 1)}
        className="rounded border bg-transparent px-2 py-1 disabled:opacity-45"
        style={{ borderColor: COLOR.border, color: COLOR.missionsBodyText }}
      >
        <option value={0}>Passive</option>
        <option value={1}>Attack</option>
      </select>
      <select
        value={sw}
        disabled={disabled}
        onChange={(e) => setSw(Number(e.target.value) as 0 | 1)}
        className="rounded border bg-transparent px-2 py-1 disabled:opacity-45"
        style={{ borderColor: COLOR.border, color: COLOR.missionsBodyText }}
      >
        <option value={0}>Off</option>
        <option value={1}>On</option>
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(mode, sw)}
        className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-45"
        style={{
          borderColor: COLOR.missionCreateFieldBorder,
          color: COLOR.missionsBodyText,
        }}
      >
        Send
      </button>
    </div>
  );
}
