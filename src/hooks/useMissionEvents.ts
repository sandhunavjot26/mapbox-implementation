/**
 * Mission events — REST fallback when WebSocket unavailable.
 * GET /api/v1/missions/{id}/events?event_type=DETECTED — poll 5s
 */

import { useQuery } from "@tanstack/react-query";
import { listMissionEvents } from "@/lib/api/missionEvents";
import { useTargetsStore, uavPayloadToTarget } from "@/stores/targetsStore";
import { useEffect } from "react";

export const missionEventsKeys = {
  all: (missionId: string) => ["missionEvents", missionId] as const,
};

/** Poll DETECTED events; sync to targets store. Use when WebSocket unavailable (REST fallback). */
export function useMissionEvents(
  missionId: string | null,
  enabled: boolean,
  useFallback: boolean
) {
  const { data, isSuccess } = useQuery({
    queryKey: missionEventsKeys.all(missionId ?? ""),
    queryFn: () =>
      listMissionEvents(missionId!, {
        event_type: "DETECTED",
        limit: 200,
      }),
    enabled: !!missionId && enabled && useFallback,
    refetchInterval: 5000, // 5s poll per AeroShield doc
    staleTime: 2000,
  });

  const setTargets = useTargetsStore((s) => s.setTargets);

  useEffect(() => {
    if (!isSuccess || !data) return;
    const targets = data
      .filter((e) => e.event_type === "DETECTED" && e.payload)
      .map((e) => {
        const payload = e.payload as { uav?: Record<string, unknown> };
        const uav = payload?.uav;
        if (!uav) return null;
        return uavPayloadToTarget(
          uav as unknown as Parameters<typeof uavPayloadToTarget>[0],
          e.device_id,
          e.id
        );
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
    // Deduplicate by id — same target_uid can appear in multiple events; keep last (most recent)
    const byId = new Map<string, (typeof targets)[0]>();
    for (const t of targets) byId.set(t.id, t);
    setTargets([...byId.values()]);
  }, [data, isSuccess, setTargets]);

  return { data, isSuccess };
}
