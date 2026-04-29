/**
 * Full device + live state + config (drawer) — 5s poll while `open` is true.
 */

import { useQuery } from "@tanstack/react-query";
import { getDevice, getDeviceConfig, getDeviceState } from "@/lib/api/devices";

export const deviceDetailKeys = {
  one: (id: string) => ["devices", "detail", id] as const,
  state: (id: string) => ["devices", "state", id] as const,
  config: (id: string) => ["devices", "config", id] as const,
};

export function useDeviceDetailQueries(deviceId: string | null, open: boolean) {
  const deviceQ = useQuery({
    queryKey: deviceDetailKeys.one(deviceId ?? ""),
    queryFn: () => getDevice(deviceId!),
    enabled: !!deviceId && open,
  });
  const stateQ = useQuery({
    queryKey: deviceDetailKeys.state(deviceId ?? ""),
    queryFn: () => getDeviceState(deviceId!),
    enabled: !!deviceId && open,
    refetchInterval: open && deviceId ? 5000 : false,
  });
  const configQ = useQuery({
    queryKey: deviceDetailKeys.config(deviceId ?? ""),
    queryFn: () => getDeviceConfig(deviceId!),
    enabled: !!deviceId && open,
    refetchInterval: open && deviceId ? 5000 : false,
  });
  return { deviceQ, stateQ, configQ };
}
