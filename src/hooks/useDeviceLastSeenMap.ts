import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getDeviceStates } from "@/lib/api/devices";
import type { Device } from "@/types/aeroshield";

/**
 * Merges `last_seen` from `GET /devices/states/by-mission/{id}` for each
 * unique mission in the current device list.
 */
export function useDeviceLastSeenMap(devices: Device[] | undefined) {
  const missionIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of devices ?? []) {
      if (d.mission_id) s.add(d.mission_id);
    }
    return [...s];
  }, [devices]);

  const results = useQueries({
    queries: missionIds.map((mid) => ({
      queryKey: ["deviceStates", "mission", mid] as const,
      queryFn: () => getDeviceStates(mid),
      staleTime: 15_000,
    })),
  });

  return useMemo(() => {
    const m = new Map<string, string>();
    for (const r of results) {
      for (const row of r.data ?? []) {
        if (row.device_id && row.last_seen) {
          m.set(row.device_id, row.last_seen);
        }
      }
    }
    return m;
  }, [results]);
}
