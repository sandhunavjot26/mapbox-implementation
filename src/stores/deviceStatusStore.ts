/**
 * Device status store — real-time status from WebSocket (device_state_update, device_online).
 * Per AeroShield Live Operations Guide Section 4.1: device-service pushes status/config updates.
 * Merged with mission devices when displaying; overrides API status when WS data is newer.
 */

import { create } from "zustand";

export interface DeviceStatusEntry {
  device_id: string;
  monitor_device_id?: number;
  status: string;
  last_seen: string;
  name?: string;
  op_status?: string | number;
  /** §E.1 DEVICE_AZIMUTH (merged from events stream) */
  azimuth_deg?: number;
  elevation_deg?: number;
  azimuth_updated_at?: number;
  updatedAt: number;
}

interface DeviceStatusState {
  byDeviceId: Record<string, DeviceStatusEntry>;
  setDeviceStatus: (entry: Omit<DeviceStatusEntry, "updatedAt">) => void;
  /**
   * Merge azimuth/elevation without changing `status` (or create minimal entry if none).
   */
  updateDeviceAzimuth: (
    deviceId: string,
    patch: { azimuth_deg: number; elevation_deg?: number; monitor_device_id?: number },
  ) => void;
  getDeviceStatus: (deviceId: string) => DeviceStatusEntry | undefined;
  clear: () => void;
}

export const useDeviceStatusStore = create<DeviceStatusState>((set, get) => ({
  byDeviceId: {},

  setDeviceStatus: (entry) =>
    set((state) => ({
      byDeviceId: {
        ...state.byDeviceId,
        [entry.device_id]: { ...state.byDeviceId[entry.device_id], ...entry, updatedAt: Date.now() },
      },
    })),

  updateDeviceAzimuth: (deviceId, patch) =>
    set((state) => {
      const cur = state.byDeviceId[deviceId];
      const now = Date.now();
      const base =
        cur ??
        ({
          device_id: deviceId,
          status: "ONLINE",
          last_seen: new Date().toISOString(),
          updatedAt: now,
        } as DeviceStatusEntry);
      const next: DeviceStatusEntry = {
        ...base,
        device_id: deviceId,
        monitor_device_id: patch.monitor_device_id ?? base.monitor_device_id,
        azimuth_deg: patch.azimuth_deg,
        elevation_deg:
          patch.elevation_deg != null ? patch.elevation_deg : base.elevation_deg,
        azimuth_updated_at: now,
        updatedAt: now,
      };
      return {
        byDeviceId: {
          ...state.byDeviceId,
          [deviceId]: next,
        },
      };
    }),

  getDeviceStatus: (deviceId) => get().byDeviceId[deviceId],

  clear: () => set({ byDeviceId: {} }),
}));
