/**
 * Device health rollup (ported from old-ui deviceHealth.ts, without reboot tracker).
 * Combines heartbeat age, alarm flags, battery, and temperature into status + action plan.
 */

import type { Device } from "@/types/aeroshield";
import type { DeviceStatusEntry } from "@/stores/deviceStatusStore";

/** Pull typed telemetry from WS / REST device `state` blob into store fields. */
export function telemetryFromDeviceState(state: unknown): Partial<DeviceStatusEntry> {
  if (!state || typeof state !== "object") return {};
  const s = state as Record<string, unknown>;
  const out: Partial<DeviceStatusEntry> = {};
  if (typeof s.last_seen === "string") out.last_seen = s.last_seen;
  if (typeof s.op_status === "number" || typeof s.op_status === "string") {
    out.op_status = s.op_status as string | number;
  }
  if (typeof s.power_mode === "number") out.power_mode = s.power_mode;
  if (typeof s.battery_pct === "number") out.battery_pct = s.battery_pct;
  if (typeof s.temp_c === "number") out.temp_c = s.temp_c;
  if (typeof s.temperature_c === "number") out.temperature_c = s.temperature_c;
  if (typeof s.humidity_pct === "number") out.humidity_pct = s.humidity_pct;
  if (s.rf_alarm === true) out.rf_alarm = true;
  if (s.jammer_alarm === true) out.jammer_alarm = true;
  if (s.pa_alarm === true) out.pa_alarm = true;
  if (s.gps_alarm === true) out.gps_alarm = true;
  if (s.fan_alarm === true) out.fan_alarm = true;
  if (s.link_alarm === true) out.link_alarm = true;
  if (typeof s.azimuth_deg === "number" && Number.isFinite(s.azimuth_deg)) {
    out.azimuth_deg = s.azimuth_deg;
  }
  if (typeof s.elevation_deg === "number" && Number.isFinite(s.elevation_deg)) {
    out.elevation_deg = s.elevation_deg;
  }
  return out;
}

/** B.3 device state + `turntable_state` — same fields as WS `device_state_update.state`. */
export function readAzimuthFromDeviceStatePayload(
  state: unknown,
): { azimuth_deg: number; elevation_deg?: number } | null {
  if (!state || typeof state !== "object") return null;
  const s = state as Record<string, unknown>;
  if (typeof s.azimuth_deg === "number" && Number.isFinite(s.azimuth_deg)) {
    const el = s.elevation_deg;
    return {
      azimuth_deg: s.azimuth_deg,
      elevation_deg: typeof el === "number" && Number.isFinite(el) ? el : undefined,
    };
  }
  const tt = s.turntable_state;
  if (tt && typeof tt === "object") {
    const t = tt as Record<string, unknown>;
    if (typeof t.azimuth_deg === "number" && Number.isFinite(t.azimuth_deg)) {
      return { azimuth_deg: t.azimuth_deg };
    }
  }
  return null;
}

export type HealthStatus = "ONLINE" | "DEGRADED" | "ALARM" | "OFFLINE";

export interface HealthReport {
  status: HealthStatus;
  reasons: string[];
  actionPlan: string[];
  lastSeenSeconds?: number;
}

const OFFLINE_AFTER_S = 60;
const DEGRADED_AFTER_S = 30;
const BATTERY_WARN_PCT = 25;
const BATTERY_CRIT_PCT = 10;
const TEMP_HIGH_C = 70;
const TEMP_CRIT_C = 85;

function formatAge(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function toNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Build a flat state object for health + telemetry grid from store + device. */
export function relativeTimeShort(iso?: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const dt = Date.now() - t;
  const s = Math.floor(dt / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function mergedDeviceStateForUi(
  device: Device,
  live: DeviceStatusEntry | undefined,
): Record<string, unknown> {
  if (!live) {
    return {};
  }
  return {
    last_seen: live.last_seen,
    op_status: live.op_status,
    power_mode: live.power_mode,
    battery_pct: live.battery_pct,
    temp_c: live.temp_c ?? live.temperature_c,
    humidity_pct: live.humidity_pct,
    azimuth_deg: live.azimuth_deg,
    elevation_deg: live.elevation_deg,
    rf_alarm: live.rf_alarm,
    jammer_alarm: live.jammer_alarm,
    pa_alarm: live.pa_alarm,
    gps_alarm: live.gps_alarm,
    fan_alarm: live.fan_alarm,
    link_alarm: live.link_alarm,
  };
}

export function assessDeviceHealth(
  device: Device,
  state: Record<string, unknown>,
): HealthReport {
  const reasons: string[] = [];
  const actionPlan: string[] = [];

  const now = Date.now();
  const lastSeenIso =
    (typeof state.last_seen === "string" ? state.last_seen : null) ?? null;
  const lastSeenMs = lastSeenIso ? Date.parse(lastSeenIso) : NaN;
  const ageS = Number.isFinite(lastSeenMs)
    ? Math.max(0, Math.floor((now - lastSeenMs) / 1000))
    : undefined;

  let status: HealthStatus = "ONLINE";

  if (ageS === undefined) {
    status = "OFFLINE";
    reasons.push("Device has never reported a heartbeat.");
    actionPlan.push(
      "Verify the edge-connector is running on the field laptop.",
      "Check the radar is powered and the Ethernet cable is seated.",
      "Confirm link-layer reachability to the radar IP.",
    );
  } else if (ageS > OFFLINE_AFTER_S) {
    status = "OFFLINE";
    reasons.push(`No heartbeat for ${formatAge(ageS)}.`);
    actionPlan.push(
      "Check edge-connector health on the field laptop.",
      "Verify Internet / tunnel path to command-service.",
      "If persistent beyond 15 minutes, escalate and consider failover.",
    );
  } else if (ageS > DEGRADED_AFTER_S) {
    status = "DEGRADED";
    reasons.push(`Heartbeat delayed (${formatAge(ageS)} ago).`);
    actionPlan.push(
      "Monitor for recovery in the next 60s before escalating.",
      "Check edge-connector logs for reconnect attempts.",
    );
  }

  const alarmFlags: Array<[string, boolean | undefined, string]> = [
    ["rf_alarm", state.rf_alarm === true ? true : undefined, "Radar RF front-end alarm"],
    ["jammer_alarm", state.jammer_alarm === true ? true : undefined, "Jammer module alarm"],
    ["pa_alarm", state.pa_alarm === true ? true : undefined, "Power amplifier alarm"],
    ["gps_alarm", state.gps_alarm === true ? true : undefined, "GPS lock lost"],
    ["fan_alarm", state.fan_alarm === true ? true : undefined, "Fan/thermal alarm"],
    ["link_alarm", state.link_alarm === true ? true : undefined, "Data link alarm"],
  ];
  const activeAlarms = alarmFlags.filter(([, v]) => v === true);
  if (activeAlarms.length) {
    if (status !== "OFFLINE") status = "ALARM";
    for (const [, , label] of activeAlarms) {
      reasons.push(label);
    }
    actionPlan.push(
      `Investigate ${activeAlarms.length === 1 ? "alarm" : "alarms"}: ${activeAlarms.map(([k]) => k).join(", ")}.`,
      "Consult the device manual for the specific alarm code and remediation.",
      "If the alarm persists beyond 5 minutes, mark the device out of service.",
    );
  }

  const battery = toNumber(state.battery_pct ?? state.battery);
  if (battery !== undefined) {
    if (battery < BATTERY_CRIT_PCT) {
      if (status !== "OFFLINE") status = "ALARM";
      reasons.push(`Battery critically low (${battery.toFixed(0)}%).`);
      actionPlan.push("Swap battery or connect mains power immediately.");
    } else if (battery < BATTERY_WARN_PCT) {
      if (status === "ONLINE") status = "DEGRADED";
      reasons.push(`Battery low (${battery.toFixed(0)}%).`);
      actionPlan.push("Schedule a battery swap within the next 30 minutes.");
    }
  }

  const tempC = toNumber(state.temp_c ?? state.temperature_c ?? state.temperature);
  if (tempC !== undefined) {
    if (tempC > TEMP_CRIT_C) {
      if (status !== "OFFLINE") status = "ALARM";
      reasons.push(`Temperature critical (${tempC.toFixed(0)} °C).`);
      actionPlan.push("Power-cycle or shade the radar; risk of thermal cut-out.");
    } else if (tempC > TEMP_HIGH_C) {
      if (status === "ONLINE") status = "DEGRADED";
      reasons.push(`Temperature elevated (${tempC.toFixed(0)} °C).`);
      actionPlan.push("Verify airflow and fan operation; shade the enclosure if possible.");
    }
  }

  return { status, reasons, actionPlan, lastSeenSeconds: ageS };
}

export function healthPillSurface(status: HealthStatus): {
  bg: string;
  fg: string;
  border: string;
  label: string;
} {
  switch (status) {
    case "ONLINE":
      return {
        bg: "rgba(16, 185, 129, 0.15)",
        fg: "#6ee7b7",
        border: "1px solid rgba(16, 185, 129, 0.4)",
        label: "ONLINE",
      };
    case "DEGRADED":
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        fg: "#fcd34d",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        label: "DEGRADED",
      };
    case "ALARM":
      return {
        bg: "rgba(239, 68, 68, 0.15)",
        fg: "#fca5a5",
        border: "1px solid rgba(239, 68, 68, 0.45)",
        label: "ALARM",
      };
    case "OFFLINE":
    default:
      return {
        bg: "rgba(100, 116, 139, 0.2)",
        fg: "#cbd5e1",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        label: "OFFLINE",
      };
  }
}

export function healthBannerSurface(status: HealthStatus): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (status) {
    case "ONLINE":
      return {
        bg: "rgba(16, 185, 129, 0.08)",
        fg: "#a7f3d0",
        border: "1px solid rgba(16, 185, 129, 0.28)",
      };
    case "DEGRADED":
      return {
        bg: "rgba(245, 158, 11, 0.1)",
        fg: "#fde68a",
        border: "1px solid rgba(245, 158, 11, 0.35)",
      };
    case "ALARM":
      return {
        bg: "rgba(239, 68, 68, 0.1)",
        fg: "#fecaca",
        border: "1px solid rgba(239, 68, 68, 0.35)",
      };
    case "OFFLINE":
    default:
      return {
        bg: "rgba(71, 85, 105, 0.2)",
        fg: "#e2e8f0",
        border: "1px solid rgba(148, 163, 184, 0.35)",
      };
  }
}
