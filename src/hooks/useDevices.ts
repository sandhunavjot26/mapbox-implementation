/**
 * TanStack Query hooks for devices API.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignDevices, listDevices } from "@/lib/api/devices";
import { missionsKeys } from "@/hooks/useMissions";

export const devicesKeys = {
  all: ["devices"] as const,
  list: (params?: {
    mission_id?: string;
    device_type?: string;
    status?: string;
  }) =>
    [
      ...devicesKeys.all,
      "list",
      params?.mission_id ?? "",
      params?.device_type ?? "",
      params?.status ?? "",
    ] as const,
};

export function useDevicesList(
  params?: {
    mission_id?: string;
    device_type?: string;
    status?: string;
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
