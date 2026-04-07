/**
 * TanStack Query mutation hooks for Zones API.
 * Create and delete zones under a mission, with automatic cache invalidation
 * for mission detail and map features queries.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createZone, deleteZone, type CreateZonePayload } from "@/lib/api/zones";
import { missionsKeys } from "@/hooks/useMissions";

/** POST /api/v1/missions/{missionId}/zones — create a zone, then invalidate caches. */
export function useCreateZone(missionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateZonePayload) => createZone(missionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionsKeys.detail(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.mapFeatures(missionId) });
    },
  });
}

/** DELETE /api/v1/missions/{missionId}/zones/{zoneId} — delete a zone, then invalidate caches. */
export function useDeleteZone(missionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zoneId: string) => deleteZone(missionId, zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionsKeys.detail(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.mapFeatures(missionId) });
    },
  });
}
