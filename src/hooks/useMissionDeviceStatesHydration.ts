/**
 * Seeds / refreshes `deviceStatusStore` from GET .../devices/states/by-mission/{id}.
 * Matches old-ui REST hydration so wedges and panels stay in sync when the devices WS
 * is quiet or another client (e.g. legacy UI) moves the turntable.
 */

import { useEffect } from "react";
import { useDeviceStates } from "@/hooks/useDeviceStates";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import {
  readAzimuthFromDeviceStatePayload,
  telemetryFromDeviceState,
} from "@/utils/deviceHealth";

export function useMissionDeviceStatesHydration(
  missionId: string | null,
  enabled: boolean,
) {
  const { data } = useDeviceStates(missionId, enabled);
  const setDeviceStatus = useDeviceStatusStore((s) => s.setDeviceStatus);
  const updateDeviceAzimuth = useDeviceStatusStore((s) => s.updateDeviceAzimuth);
  const getDeviceStatus = useDeviceStatusStore((s) => s.getDeviceStatus);

  useEffect(() => {
    if (!data?.length) return;
    for (const row of data) {
      if (!row.device_id) continue;
      const tel = telemetryFromDeviceState(row);
      const lastSeen =
        (typeof tel.last_seen === "string" ? tel.last_seen : undefined) ??
        row.last_seen ??
        new Date().toISOString();
      const cur = getDeviceStatus(row.device_id);
      setDeviceStatus({
        device_id: row.device_id,
        status: cur?.status ?? "ONLINE",
        last_seen: lastSeen,
        op_status: tel.op_status ?? row.op_status,
        ...tel,
      });
      const azi = readAzimuthFromDeviceStatePayload(row);
      if (azi) {
        updateDeviceAzimuth(row.device_id, {
          azimuth_deg: azi.azimuth_deg,
          elevation_deg: azi.elevation_deg,
        });
      }
    }
  }, [data, setDeviceStatus, updateDeviceAzimuth, getDeviceStatus]);
}
