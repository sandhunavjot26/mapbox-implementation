/**
 * Device states — REST fallback when WebSocket unavailable.
 * GET /api/v1/devices/states/by-mission/{id} — poll 5–10s
 */

import { useQuery } from "@tanstack/react-query";
import { getDeviceStates } from "@/lib/api/devices";

export const deviceStatesKeys = {
  all: (missionId: string) => ["deviceStates", missionId] as const,
};

export function useDeviceStates(missionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: deviceStatesKeys.all(missionId ?? ""),
    queryFn: () => getDeviceStates(missionId!),
    enabled: !!missionId && enabled,
    refetchInterval: 8000, // 8s poll per AeroShield doc
    staleTime: 5000,
  });
}
