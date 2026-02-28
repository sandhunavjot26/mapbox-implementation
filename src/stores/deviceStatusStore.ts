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
  op_status?: string;
  updatedAt: number;
}

interface DeviceStatusState {
  byDeviceId: Record<string, DeviceStatusEntry>;
  setDeviceStatus: (entry: Omit<DeviceStatusEntry, "updatedAt">) => void;
  getDeviceStatus: (deviceId: string) => DeviceStatusEntry | undefined;
  clear: () => void;
}

export const useDeviceStatusStore = create<DeviceStatusState>((set, get) => ({
  byDeviceId: {},

  setDeviceStatus: (entry) =>
    set((state) => ({
      byDeviceId: {
        ...state.byDeviceId,
        [entry.device_id]: { ...entry, updatedAt: Date.now() },
      },
    })),

  getDeviceStatus: (deviceId) => get().byDeviceId[deviceId],

  clear: () => set({ byDeviceId: {} }),
}));
