/**
 * TanStack Query hooks for missions API.
 * GET /api/v1/missions — list with search
 * GET /api/v1/missions/{id} — full load
 * GET /api/v1/missions/{id}/map/features — GeoJSON (poll 15–30s)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listMissions,
  loadMission,
  createMission,
  getMapFeatures,
} from "@/lib/api/missions";

export const missionsKeys = {
  all: ["missions"] as const,
  list: (q?: string) => [...missionsKeys.all, "list", q ?? ""] as const,
  detail: (id: string) => [...missionsKeys.all, "detail", id] as const,
  mapFeatures: (id: string) => [...missionsKeys.all, "mapFeatures", id] as const,
};

/** GET /api/v1/missions — list missions */
export function useMissionsList(q?: string) {
  return useQuery({
    queryKey: missionsKeys.list(q),
    queryFn: () => listMissions(q),
  });
}

/** GET /api/v1/missions/{id} — full load */
export function useMissionLoad(missionId: string | null, enabled = true) {
  return useQuery({
    queryKey: missionsKeys.detail(missionId ?? ""),
    queryFn: () => loadMission(missionId!),
    enabled: !!missionId && enabled,
    staleTime: 30 * 1000,
  });
}

/** POST /api/v1/missions — create mission */
export function useCreateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: missionsKeys.all });
    },
  });
}

/** GET /api/v1/missions/{id}/map/features — GeoJSON, poll 15–30s */
export function useMapFeatures(missionId: string | null, enabled = true) {
  return useQuery({
    queryKey: missionsKeys.mapFeatures(missionId ?? ""),
    queryFn: () => getMapFeatures(missionId!),
    enabled: !!missionId && enabled,
    refetchInterval: 20 * 1000, // 20s poll per AeroShield doc
    staleTime: 15 * 1000,
  });
}
