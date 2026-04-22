/**
 * Mission events — REST one-shot timeline backfill when the events WebSocket is not open yet.
 * Does **not** write to `targetsStore` (live tracks are WS-only in `useMissionSockets`).
 * GET /api/v1/missions/{id}/events?from_ts=... — last 15 minutes, one fetch (no poll).
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listMissionEvents } from "@/lib/api/missionEvents";
import { useMissionEventsStore } from "@/stores/missionEventsStore";

const TIMELINE_BACKFILL_MS = 15 * 60 * 1000;

export const missionEventsKeys = {
  all: (missionId: string) => ["missionEvents", missionId] as const,
  timelineBackfill: (missionId: string) =>
    [...missionEventsKeys.all(missionId), "timelineBackfill"] as const,
};

/**
 * When `useFallback` is true (events WS not "open" yet), fetches recent mission events
 * and merges them into the timeline store. Deduplication is by event id in `missionEventsStore`.
 */
export function useMissionEvents(
  missionId: string | null,
  enabled: boolean,
  useFallback: boolean
) {
  const addEvent = useMissionEventsStore((s) => s.addEvent);

  const { data, isSuccess } = useQuery({
    queryKey: missionEventsKeys.timelineBackfill(missionId ?? ""),
    queryFn: () => {
      const from = new Date(Date.now() - TIMELINE_BACKFILL_MS).toISOString();
      return listMissionEvents(missionId!, {
        from_ts: from,
        limit: 500,
      });
    },
    enabled: Boolean(missionId) && enabled && useFallback,
    refetchOnMount: true,
    refetchInterval: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isSuccess || !data?.length) return;
    const cutoff = Date.now() - TIMELINE_BACKFILL_MS;
    const recent = data.filter((e) => {
      const t = Date.parse(e.ts);
      return !Number.isNaN(t) && t >= cutoff;
    });
    const sorted = [...recent].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
    );
    for (const e of sorted) {
      const pl = e.payload;
      addEvent({
        id: e.id,
        mission_id: e.mission_id,
        device_id: e.device_id,
        event_type: e.event_type,
        ts: e.ts,
        payload: pl && Object.keys(pl).length > 0 ? pl : null,
      });
    }
  }, [data, isSuccess, addEvent]);

  return { data, isSuccess };
}

/** Alias — same as `useMissionEvents` (timeline-only REST backfill; no target seeding). */
export const useMissionEventsBackfill = useMissionEvents;
