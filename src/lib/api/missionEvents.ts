/**
 * Mission events API — REST fallback when WebSocket unavailable.
 * GET /api/v1/missions/{id}/events — list events (DETECTED, etc.)
 */

import { apiJson } from "./client";
import type { MissionEvent } from "@/types/aeroshield";

export async function listMissionEvents(
  missionId: string,
  params?: {
    event_type?: string;
    limit?: number;
    offset?: number;
    from_ts?: string;
    to_ts?: string;
  }
): Promise<MissionEvent[]> {
  const search = new URLSearchParams();
  if (params?.event_type) search.set("event_type", params.event_type);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  if (params?.from_ts) search.set("from_ts", params.from_ts);
  if (params?.to_ts) search.set("to_ts", params.to_ts);
  const qs = search.toString() ? `?${search}` : "";
  return apiJson<MissionEvent[]>(
    "device",
    `/api/v1/missions/${missionId}/events${qs}`
  );
}
