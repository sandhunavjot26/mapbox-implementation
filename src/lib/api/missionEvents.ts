/**
 * Mission events API — REST fallback when WebSocket unavailable.
 * GET /api/v1/missions/{id}/events — list events (DETECTED, etc.)
 * GET .../events.csv | events.ndjson — AAR exports (apiBlob)
 */

import { apiBlob, apiJsonWithHeaders, type ApiBlobResult } from "./client";
import type { MissionEvent } from "@/types/aeroshield";

export type MissionEventsQuery = {
  event_type?: string;
  limit?: number;
  offset?: number;
  from_ts?: string;
  to_ts?: string;
  device_id?: string;
  target_uid?: string;
  zone_id?: string;
  source?: string;
};

function buildMissionEventsQuery(params?: MissionEventsQuery): string {
  const search = new URLSearchParams();
  if (params?.event_type) search.set("event_type", params.event_type);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  if (params?.from_ts) search.set("from_ts", params.from_ts);
  if (params?.to_ts) search.set("to_ts", params.to_ts);
  if (params?.device_id) search.set("device_id", params.device_id);
  if (params?.target_uid) search.set("target_uid", params.target_uid);
  if (params?.zone_id) search.set("zone_id", params.zone_id);
  if (params?.source) search.set("source", params.source);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listMissionEventsWithTotal(
  missionId: string,
  params?: MissionEventsQuery
): Promise<{ items: MissionEvent[]; total: number | null }> {
  const qs = buildMissionEventsQuery(params);
  const { data, headers } = await apiJsonWithHeaders<MissionEvent[]>(
    "device",
    `/api/v1/missions/${missionId}/events${qs}`
  );
  const raw = headers.get("X-Total-Count");
  const n = raw != null ? Number.parseInt(raw, 10) : NaN;
  return {
    items: Array.isArray(data) ? data : [],
    total: Number.isFinite(n) ? n : null,
  };
}

export async function listMissionEvents(
  missionId: string,
  params?: MissionEventsQuery
): Promise<MissionEvent[]> {
  const { items } = await listMissionEventsWithTotal(missionId, params);
  return items;
}

/** Streaming CSV export; respects the same filters as GET /events. */
export function downloadMissionEventsCsv(
  missionId: string,
  params?: MissionEventsQuery
): Promise<ApiBlobResult> {
  const qs = buildMissionEventsQuery(params);
  return apiBlob("device", `/api/v1/missions/${missionId}/events.csv${qs}`);
}

/** Streaming NDJSON export. */
export function downloadMissionEventsNdjson(
  missionId: string,
  params?: MissionEventsQuery
): Promise<ApiBlobResult> {
  const qs = buildMissionEventsQuery(params);
  return apiBlob("device", `/api/v1/missions/${missionId}/events.ndjson${qs}`);
}
