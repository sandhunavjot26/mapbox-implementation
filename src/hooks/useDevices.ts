/**
 * TanStack Query hooks for devices API.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignDevices,
  listDevices,
  patchDevice,
} from "@/lib/api/devices";
import type { DevicePatch } from "@/types/aeroshield";
import { missionsKeys } from "@/hooks/useMissions";

export const devicesKeys = {
  all: ["devices"] as const,
  list: (params?: {
    mission_id?: string;
    device_type?: string;
    status?: string;
    protocol?: string;
  }) =>
    [
      ...devicesKeys.all,
      "list",
      params?.mission_id ?? "",
      params?.device_type ?? "",
      params?.status ?? "",
      params?.protocol ?? "",
    ] as const,
};

export function useDevicesList(
  params?: {
    mission_id?: string;
    device_type?: string;
    status?: string;
    protocol?: string;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: devicesKeys.list(params),
    queryFn: () => listDevices(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      body,
      previousMissionId,
    }: {
      deviceId: string;
      body: DevicePatch;
      previousMissionId?: string | null;
    }) => patchDevice(deviceId, body),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: devicesKeys.all });
      queryClient.invalidateQueries({
        queryKey: ["devices", "detail", vars.deviceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["devices", "state", vars.deviceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["devices", "config", vars.deviceId],
      });
      const mids = new Set<string>();
      if (vars.previousMissionId) mids.add(vars.previousMissionId);
      if (data.mission_id) mids.add(data.mission_id);
      mids.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: missionsKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: missionsKeys.mapFeatures(id) });
      });
      queryClient.invalidateQueries({
        queryKey: ["deviceStates", "mission"],
      });
    },
  });
}

export function useAssignDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      missionId,
      deviceIds,
    }: {
      missionId: string;
      deviceIds: string[];
    }) => assignDevices(missionId, deviceIds),
    onSuccess: (_data, { missionId }) => {
      queryClient.invalidateQueries({ queryKey: missionsKeys.all });
      queryClient.invalidateQueries({ queryKey: missionsKeys.detail(missionId) });
      queryClient.invalidateQueries({ queryKey: missionsKeys.mapFeatures(missionId) });
      queryClient.invalidateQueries({ queryKey: devicesKeys.all });
    },
  });
}
