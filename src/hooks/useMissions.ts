/**
 * TanStack Query hooks for missions API.
 * GET /api/v1/missions — list with search
 * GET /api/v1/missions/{id} — full load
 * GET /api/v1/missions/{id}/map/features — GeoJSON (poll 15–30s)
 */

import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import {
  listMissions,
  loadMission,
  createMission,
  getMapFeatures,
  activateMission,
  stopMission,
  getMissionOverlaps,
} from "@/lib/api/missions";
import { resolveMissionCardStatus } from "@/utils/missionListUi";
import { devicesToAssets } from "@/utils/missionAssets";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";

export const missionsKeys = {
  all: ["missions"] as const,
  list: (q?: string) => [...missionsKeys.all, "list", q ?? ""] as const,
  detail: (id: string) => [...missionsKeys.all, "detail", id] as const,
  mapFeatures: (id: string) => [...missionsKeys.all, "mapFeatures", id] as const,
  overlaps: (id: string) => [...missionsKeys.all, "overlaps", id] as const,
  landingAssets: ["missions", "landingAssets"] as const,
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

/** GET /api/v1/missions/{id}/overlaps — coverage / jammer overlap warnings */
export function useMissionOverlaps(
  missionId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: missionsKeys.overlaps(missionId ?? ""),
    queryFn: () => getMissionOverlaps(missionId!),
    enabled: !!missionId && enabled,
    staleTime: 20 * 1000,
  });
}

/** POST /api/v1/missions/{id}/activate */
export function useActivateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => activateMission(missionId),
    onSuccess: (_data, missionId) => {
      queryClient.invalidateQueries({ queryKey: missionsKeys.detail(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.mapFeatures(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.overlaps(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.all });
    },
  });
}

/** POST /api/v1/missions/{id}/stop */
export function useStopMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => stopMission(missionId),
    onSuccess: (_data, missionId) => {
      queryClient.invalidateQueries({ queryKey: missionsKeys.detail(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.mapFeatures(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.overlaps(missionId) });
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

/**
 * Derive border features from the mission list for the landing overview map.
 * Returns a GeoJSON Feature per mission that has a non-null border_geojson,
 * with missionName / missionId in properties for labeling.
 */
export function useLandingBorders() {
  const { data: missions } = useMissionsList(undefined);

  return useMemo(() => {
    if (!missions) return [];
    return missions
      .filter((m): m is typeof m & { border_geojson: GeoJSON.Polygon } =>
        m.border_geojson != null,
      )
      .map((m) => ({
        type: "Feature" as const,
        properties: { missionName: m.name, missionId: m.id },
        geometry: m.border_geojson,
      }));
  }, [missions]);
}

/** Aggregate radar assets from missions shown on the landing overview map.
 * Includes DRAFT (resolved as SCHEDULED) and training so assigned radars appear
 * before activation; excludes COMPLETED only. */
export function useLandingMissionAssets(enabled = true) {
  const missionsQuery = useMissionsList(undefined);
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);
  const statusOverrides = Object.fromEntries(
    Object.values(byDeviceId).map((entry) => [entry.device_id, entry.status]),
  );

  const activeMissions =
    missionsQuery.data?.filter((mission) => {
      const status = resolveMissionCardStatus(mission);
      return status !== "COMPLETED";
    }) ?? [];

  const missionQueries = useQueries({
    queries: activeMissions.map((mission) => ({
      queryKey: missionsKeys.detail(mission.id),
      queryFn: () => loadMission(mission.id),
      enabled,
      staleTime: 30 * 1000,
    })),
  });

  const data = missionQueries.flatMap((query) =>
    query.data ? devicesToAssets(query.data.devices, statusOverrides) : [],
  );

  return {
    data,
    isLoading:
      missionsQuery.isLoading ||
      missionQueries.some((query) => query.isLoading),
    isFetching:
      missionsQuery.isFetching ||
      missionQueries.some((query) => query.isFetching),
    error:
      missionsQuery.error ??
      missionQueries.find((query) => query.error)?.error ??
      null,
  };
}
