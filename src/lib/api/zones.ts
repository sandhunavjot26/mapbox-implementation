/**
 * Zones API — CRUD under a mission scope.
 * POST   /api/v1/missions/{missionId}/zones
 * GET    /api/v1/missions/{missionId}/zones
 * PATCH  /api/v1/missions/{missionId}/zones/{zoneId}
 * DELETE /api/v1/missions/{missionId}/zones/{zoneId}
 */

import { apiJson, apiFetch } from "./client";
import type { Zone } from "@/types/aeroshield";

export interface CreateZonePayload {
  label: string;
  priority: number;
  zone_geojson: GeoJSON.Polygon;
  action_plan?: Record<string, unknown>;
}

export interface UpdateZonePayload {
  label?: string;
  priority?: number;
  zone_geojson?: GeoJSON.Polygon;
  action_plan?: Record<string, unknown>;
}

/** POST /api/v1/missions/{missionId}/zones */
export async function createZone(
  missionId: string,
  payload: CreateZonePayload,
): Promise<Zone> {
  return apiJson<Zone>("device", `/api/v1/missions/${missionId}/zones`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/missions/{missionId}/zones */
export async function listZones(missionId: string): Promise<Zone[]> {
  return apiJson<Zone[]>("device", `/api/v1/missions/${missionId}/zones`);
}

/** PATCH /api/v1/missions/{missionId}/zones/{zoneId} */
export async function updateZone(
  missionId: string,
  zoneId: string,
  payload: UpdateZonePayload,
): Promise<Zone> {
  return apiJson<Zone>(
    "device",
    `/api/v1/missions/${missionId}/zones/${zoneId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

/** DELETE /api/v1/missions/{missionId}/zones/{zoneId} */
export async function deleteZone(
  missionId: string,
  zoneId: string,
): Promise<void> {
  const res = await apiFetch(
    "device",
    `/api/v1/missions/${missionId}/zones/${zoneId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = (body as { detail?: string })?.detail ?? res.statusText;
    throw new Error(`Delete zone failed: ${detail}`);
  }
}
