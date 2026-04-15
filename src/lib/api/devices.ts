/**
 * Devices API — CRUD, states, configs.
 * GET /api/v1/devices — list devices (filter by mission_id, device_type, status)
 * GET /api/v1/devices/states/by-mission/{id} — device state snapshots
 * GET /api/v1/devices/configs/by-mission/{id} — device config snapshots
 */

import { apiFetch, apiJson, ApiClientError } from "./client";
import type { Device } from "@/types/aeroshield";

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

/** GET /api/v1/devices — list devices with optional filters */
export async function listDevices(params?: {
  mission_id?: string;
  device_type?: string;
  status?: string;
}): Promise<Device[]> {
  const search = params ? new URLSearchParams(params as Record<string, string>) : "";
  const qs = search.toString() ? `?${search}` : "";
  return apiJson<Device[]>("device", `/api/v1/devices${qs}`);
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

/** GET /api/v1/devices/states/by-mission/{id} — device state per mission */
export async function getDeviceStates(missionId: string): Promise<DeviceState[]> {
  return apiJson<DeviceState[]>(
    "device",
    `/api/v1/devices/states/by-mission/${missionId}`
  );
}

/** GET /api/v1/devices/configs/by-mission/{id} — device config per mission */
export async function getDeviceConfigs(missionId: string): Promise<DeviceConfig[]> {
  return apiJson<DeviceConfig[]>(
    "device",
    `/api/v1/devices/configs/by-mission/${missionId}`
  );
}
