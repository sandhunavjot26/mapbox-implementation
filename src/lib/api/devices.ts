/**
 * Devices API — CRUD, states, configs.
 * GET /api/v1/devices — list devices (filter by mission_id, device_type, status)
 * GET /api/v1/devices/states/by-mission/{id} — device state snapshots
 * GET /api/v1/devices/configs/by-mission/{id} — device config snapshots
 */

import { apiJson } from "./client";
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
