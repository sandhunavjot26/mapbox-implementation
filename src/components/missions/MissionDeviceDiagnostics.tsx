"use client";

import { useState } from "react";
import { createCommand, getCommandResponses } from "@/lib/api/commands";
import { formatCommandError } from "@/lib/formatCommandError";
import { useToast } from "@/components/alerts/useToast";
import { useCommandsStore } from "@/stores/commandsStore";
import { COLOR, FONT, RADIUS, SPACING } from "@/styles/driifTokens";

async function fireQueryAndWait(
  missionId: string,
  deviceId: string,
  commandType: string,
  expectedResponseDt: number,
): Promise<Record<string, unknown> | null> {
  const created = await createCommand({
    mission_id: missionId,
    device_id: deviceId,
    command_type: commandType,
    payload: {},
  });
  useCommandsStore.getState().addOrUpdateCommand({
    id: created.id,
    mission_id: created.mission_id,
    device_id: created.device_id,
    command_type: created.command_type,
    status: created.status,
    approved_count: created.approved_count,
    required_approvals: created.required_approvals,
    last_error: created.last_error,
    packet_no: created.packet_no ?? undefined,
    created_at: new Date().toISOString(),
  });
  const cmdId = created.id;
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const rows = await getCommandResponses(cmdId);
      const matching =
        rows.find((r) => Number(r.response_datatype) === expectedResponseDt) ||
        rows[0];
      if (matching?.payload != null && typeof matching.payload === "object") {
        return matching.payload as Record<string, unknown>;
      }
    } catch {
      /* keep polling */
    }
  }
  return null;
}

function relTime(ts: number | null): string {
  if (!ts) return "";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const ALARM_LABELS: Record<string, string> = {
  fan: "Fan",
  clock: "Clock",
  rx_pll: "RX PLL",
  tx_pll: "TX PLL",
  adc_chip: "ADC chip",
  eeprom_chip: "EEPROM chip",
  temperature_chip: "Temp sensor",
  ecompass: "E-compass",
  pa1_serial: "PA1 serial",
  pa2_serial: "PA2 serial",
  pa3_serial: "PA3 serial",
  pa4_serial: "PA4 serial",
  pa5_serial: "PA5 serial",
  pa6_serial: "PA6 serial",
};

export function MissionDeviceDiagnostics({
  missionId,
  deviceId,
  disabled,
}: {
  missionId: string;
  deviceId: string;
  disabled: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [network, setNetwork] = useState<{ data: Record<string, unknown>; ts: number } | null>(
    null,
  );
  const [attackMode, setAttackMode] = useState<{
    data: Record<string, unknown>;
    ts: number;
  } | null>(null);
  const [alarms, setAlarms] = useState<{ data: Record<string, unknown>; ts: number } | null>(
    null,
  );

  const alarmData = alarms?.data;
  const activeAlarmNames: string[] = [];
  let activeAlarmCount = 0;
  let overPowerLanes: string[] = [];
  let underPowerLanes: string[] = [];
  let serverConnAlarm = 0;
  let tempC: number | null = null;
  if (alarmData && typeof alarmData === "object") {
    const flags = (alarmData as { alarms?: Record<string, unknown> }).alarms || {};
    for (const [k, v] of Object.entries(flags)) {
      if (Number(v) === 1) {
        activeAlarmCount += 1;
        activeAlarmNames.push(ALARM_LABELS[k] || k);
      }
    }
    const op = (alarmData as { over_power?: Record<string, { count?: number }> }).over_power || {};
    for (const [lane, rec] of Object.entries(op)) {
      const count = rec?.count;
      if (Number(count) > 0) overPowerLanes.push(`${lane}(${count})`);
    }
    const up = (alarmData as { under_power?: Record<string, { count?: number }> }).under_power || {};
    for (const [lane, rec] of Object.entries(up)) {
      const count = rec?.count;
      if (Number(count) > 0) underPowerLanes.push(`${lane}(${count})`);
    }
    serverConnAlarm = Number((alarmData as { server_connection_alarm?: number }).server_connection_alarm) || 0;
    const tRaw = (alarmData as { temperature_c?: number }).temperature_c;
    tempC = Number.isFinite(tRaw) ? Number(tRaw) : null;
  }
  const totalFault =
    activeAlarmCount + overPowerLanes.length + underPowerLanes.length + serverConnAlarm;
  const alarmHealthy = alarmData && totalFault === 0;

  async function fetchNetwork() {
    setBusy("net");
    try {
      const p = await fireQueryAndWait(missionId, deviceId, "IP_QUERY", 28);
      if (p) setNetwork({ data: p, ts: Date.now() });
      else toast.warning("No network response yet");
    } catch (e) {
      toast.error(formatCommandError(e));
    } finally {
      setBusy(null);
    }
  }

  async function fetchAttackMode() {
    setBusy("attack");
    try {
      const p = await fireQueryAndWait(missionId, deviceId, "ATTACK_MODE_QUERY", 103);
      if (p) setAttackMode({ data: p, ts: Date.now() });
      else toast.warning("No attack-mode response yet");
    } catch (e) {
      toast.error(formatCommandError(e));
    } finally {
      setBusy(null);
    }
  }

  async function fetchAlarms() {
    setBusy("alarm");
    try {
      const p = await fireQueryAndWait(missionId, deviceId, "ALARM_HISTORY_QUERY", 117);
      if (p) setAlarms({ data: p, ts: Date.now() });
      else toast.warning("No alarm response yet");
    } catch (e) {
      toast.error(formatCommandError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      style={{
        marginTop: "12px",
        padding: SPACING.missionWorkspacePadX,
        borderRadius: RADIUS.panel,
        border: `1px solid ${COLOR.border}`,
        background: COLOR.missionsCardBg,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          style={{
            fontFamily: `${FONT.family}, sans-serif`,
            fontSize: FONT.sizeXs,
            fontWeight: FONT.weightMedium,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: COLOR.missionsSecondaryText,
          }}
        >
          Diagnostics
        </span>
        <span style={{ fontSize: FONT.sizeXs, color: COLOR.missionsSecondaryText }}>
          Live query
        </span>
      </div>

      <div className="flex flex-col gap-2" style={{ fontSize: FONT.sizeXs }}>
        <div className="flex flex-wrap items-start gap-2">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => void fetchNetwork()}
            className="rounded border px-2 py-1 text-left disabled:opacity-45"
            style={{
              borderColor: COLOR.border,
              color: COLOR.missionsBodyText,
              fontFamily: `${FONT.family}, sans-serif`,
              minWidth: "100px",
            }}
          >
            {busy === "net" ? "…" : "Network"}
          </button>
          <span
            className="min-w-0 flex-1 font-mono text-[11px]"
            style={{ color: COLOR.missionsSecondaryText }}
          >
            {network
              ? `${relTime(network.ts)} · ${JSON.stringify(network.data).slice(0, 200)}${JSON.stringify(network.data).length > 200 ? "…" : ""}`
              : "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => void fetchAttackMode()}
            className="rounded border px-2 py-1 text-left disabled:opacity-45"
            style={{
              borderColor: COLOR.border,
              color: COLOR.missionsBodyText,
              fontFamily: `${FONT.family}, sans-serif`,
              minWidth: "100px",
            }}
          >
            {busy === "attack" ? "…" : "Attack mode"}
          </button>
          <span
            className="min-w-0 flex-1 font-mono text-[11px]"
            style={{ color: COLOR.missionsSecondaryText }}
          >
            {attackMode
              ? `${relTime(attackMode.ts)} · ${JSON.stringify(attackMode.data)}`
              : "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => void fetchAlarms()}
            className="rounded border px-2 py-1 text-left disabled:opacity-45"
            style={{
              borderColor: COLOR.border,
              color: COLOR.missionsBodyText,
              fontFamily: `${FONT.family}, sans-serif`,
              minWidth: "100px",
            }}
          >
            {busy === "alarm" ? "…" : "Alarms"}
          </button>
          <div
            className="min-w-0 flex-1 font-mono text-[11px]"
            style={{ color: COLOR.missionsSecondaryText }}
          >
            {!alarmData ? (
              "—"
            ) : alarmHealthy ? (
              <span style={{ color: "#6ee7b7" }}>OK{tempC != null ? ` · ${tempC}°C` : ""}</span>
            ) : (
              <span>
                {activeAlarmNames.slice(0, 4).join(", ")}
                {activeAlarmNames.length > 4 ? "…" : ""}
                {overPowerLanes.length ? ` · over: ${overPowerLanes.join(",")}` : ""}
                {underPowerLanes.length ? ` · under: ${underPowerLanes.join(",")}` : ""}
                {serverConnAlarm ? " · server link alarm" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
