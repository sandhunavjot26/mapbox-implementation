/**
 * Devices API — CRUD, states, configs.
 * GET /api/v1/devices — list devices (filter by mission_id, device_type, status)
 * GET /api/v1/devices/states/by-mission/{id} — device state snapshots
 * GET /api/v1/devices/configs/by-mission/{id} — device config snapshots
 */

import { apiFetch, apiJson, ApiClientError } from "./client";
import type { Device, DevicePatch } from "@/types/aeroshield";

/** `GET /api/v1/devices/{id}/state` — §B.3 */
export interface DeviceStateFull {
  device_id: string;
  monitor_device_id?: number;
  last_seen?: string;
  remote?: { host: string; port: number };
  op_status?: number;
  azimuth_deg?: number;
  elevation_deg?: number;
  battery_pct?: number;
  power_mode?: string;
  temp_c?: number;
  humidity_pct?: number;
  lon?: number;
  lat?: number;
  alt_m?: number;
  raw_dt1?: string;
}

/** Legacy shape from `GET .../states/by-mission` (subset). */
export interface DeviceState {
  device_id: string;
  last_seen?: string;
  op_status?: string;
  azimuth_deg?: number;
  elevation_deg?: number;
  battery_pct?: number;
  lat?: number;
  lon?: number;
  alt_m?: number;
}

export interface DeviceConfig {
  device_id: string;
  [key: string]: unknown;
}

/** GET /api/v1/devices — list devices with optional filters (§B.2) */
export async function listDevices(params?: {
  mission_id?: string;
  device_type?: string;
  status?: string;
  protocol?: string;
}): Promise<Device[]> {
  const search = new URLSearchParams();
  if (params?.mission_id) search.set("mission_id", params.mission_id);
  if (params?.device_type) search.set("device_type", params.device_type);
  if (params?.status) search.set("status", params.status);
  if (params?.protocol) search.set("protocol", params.protocol);
  const qs = search.toString() ? `?${search}` : "";
  return apiJson<Device[]>("device", `/api/v1/devices${qs}`);
}

/** GET /api/v1/devices/{id} — single device */
export async function getDevice(deviceId: string): Promise<Device> {
  return apiJson<Device>("device", `/api/v1/devices/${deviceId}`);
}

/** PATCH /api/v1/devices/{id} — partial update */
export async function patchDevice(deviceId: string, body: DevicePatch): Promise<Device> {
  return apiJson<Device>("device", `/api/v1/devices/${deviceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** GET /api/v1/devices/{id}/state */
export async function getDeviceState(deviceId: string): Promise<DeviceStateFull> {
  return apiJson<DeviceStateFull>("device", `/api/v1/devices/${deviceId}/state`);
}

/** GET /api/v1/devices/{id}/config */
export async function getDeviceConfig(deviceId: string): Promise<DeviceConfig> {
  return apiJson<DeviceConfig>("device", `/api/v1/devices/${deviceId}/config`);
}

/** POST /api/v1/missions/{id}/devices/assign — assign devices (radars) to a mission */
export async function assignDevices(missionId: string, deviceIds: string[]): Promise<void> {
  const res = await apiFetch("device", `/api/v1/missions/${missionId}/devices/assign`, {
    method: "POST",
    body: JSON.stringify({ device_ids: deviceIds }),
  });
  if (!res.ok) {
    let detail: string | undefined;
    const ct = res.headers.get("content-type");
    if (ct?.includes("application/json")) {
      try {
        const body = (await res.json()) as { detail?: string; message?: string };
        detail = body.detail ?? body.message;
      } catch {
        /* empty or invalid JSON body */
      }
    }
    throw new ApiClientError(res.status, detail ?? res.statusText, detail);
  }
}

/** Normalise `GET .../states/by-mission` — API may return `{ device_id, state }` or flat rows. */
function normaliseMissionDeviceStates(
  raw: unknown
): DeviceState[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row: unknown) => {
    if (!row || typeof row !== "object") return row as DeviceState;
    const o = row as Record<string, unknown>;
    if (
      typeof o.state === "object" &&
      o.state !== null &&
      typeof o.device_id === "string"
    ) {
      return {
        device_id: o.device_id,
        ...(o.state as Record<string, unknown>),
      } as DeviceState;
    }
    return row as DeviceState;
  });
}

/** GET /api/v1/devices/states/by-mission/{id} — device state per mission */
export async function getDeviceStates(missionId: string): Promise<DeviceState[]> {
  const raw = await apiJson<unknown>(
    "device",
    `/api/v1/devices/states/by-mission/${missionId}`
  );
  return normaliseMissionDeviceStates(raw);
}

/** GET /api/v1/devices/configs/by-mission/{id} — device config per mission */
export async function getDeviceConfigs(missionId: string): Promise<DeviceConfig[]> {
  return apiJson<DeviceConfig[]>(
    "device",
    `/api/v1/devices/configs/by-mission/${missionId}`
  );
}
