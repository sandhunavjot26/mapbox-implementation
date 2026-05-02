/**
 * Missions API — CRUD, map features.
 * GET /api/v1/missions — list missions with optional search
 * POST /api/v1/missions — create mission
 * GET /api/v1/missions/{id} — full load (zones, features, devices)
 * PATCH /api/v1/missions/{id} — update border/name/aop
 * GET /api/v1/missions/{id}/map/features — GeoJSON FeatureCollection for map
 */

import { apiJson } from "./client";
import type {
  Mission,
  MissionLoad,
  MapFeatureCollection,
  MissionOverlapsResult,
} from "@/types/aeroshield";

/** GET /api/v1/missions — list missions, optional ?q= search */
export async function listMissions(q?: string): Promise<Mission[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiJson<Mission[]>("device", `/api/v1/missions${params}`);
}

/** POST /api/v1/missions — create mission (API_GUIDE §6.1; server may require site_id V2.4.1) */
export async function createMission(payload: {
  name: string;
  aop?: string | null;
  border_geojson?: GeoJSON.Polygon | null;
  /** Parent site UUID — multi-site model; validated against mission border containment */
  site_id?: string | null;
}): Promise<Mission> {
  return apiJson<Mission>("device", "/api/v1/missions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/missions/{id} — full load: zones, features, devices */
export async function loadMission(missionId: string): Promise<MissionLoad> {
  return apiJson<MissionLoad>("device", `/api/v1/missions/${missionId}`);
}

/** PATCH /api/v1/missions/{id} — update border/name/aop */
export async function updateMission(
  missionId: string,
  payload: Partial<{ name: string; aop: string | null; border_geojson: GeoJSON.Polygon | null }>
): Promise<Mission> {
  return apiJson<Mission>("device", `/api/v1/missions/${missionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/missions/{id}/map/features — GeoJSON for map (border, zones, devices) */
export async function getMapFeatures(missionId: string): Promise<MapFeatureCollection> {
  return apiJson<MapFeatureCollection>(
    "device",
    `/api/v1/missions/${missionId}/map/features`
  );
}

/** POST /api/v1/missions/{id}/activate */
export async function activateMission(missionId: string): Promise<Mission> {
  return apiJson<Mission>("device", `/api/v1/missions/${missionId}/activate`, {
    method: "POST",
  });
}

/** POST /api/v1/missions/{id}/stop */
export async function stopMission(missionId: string): Promise<Mission> {
  return apiJson<Mission>("device", `/api/v1/missions/${missionId}/stop`, {
    method: "POST",
  });
}

/** GET /api/v1/missions/{id}/overlaps */
export async function getMissionOverlaps(
  missionId: string,
): Promise<MissionOverlapsResult> {
  return apiJson<MissionOverlapsResult>(
    "device",
    `/api/v1/missions/${missionId}/overlaps`,
  );
}
