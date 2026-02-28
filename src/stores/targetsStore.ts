/**
 * Targets store — live detections from events (WebSocket or REST).
 * Per rules: live telemetry not in React state; Mapbox reads from this store.
 * Classification: default UNKNOWN; client-side reclassification only.
 */

import { create } from "zustand";
import type { DetectedUavPayload } from "@/types/aeroshield";
import type { Target, TargetClassification } from "@/types/targets";

// Re-export for backward compatibility
export type { Target, TargetClassification };

interface TargetsState {
  targets: Target[];
  setTargets: (targets: Target[]) => void;
  addOrUpdateTarget: (target: Target) => void;
  reclassifyTarget: (id: string, classification: TargetClassification) => void;
  clearTargets: () => void;
}

/** Map DETECTED payload.uav to Target */
export function uavPayloadToTarget(
  uav: DetectedUavPayload,
  deviceId: string | null,
  eventId?: string,
): Target {
  const lat = uav.uav_lat ?? 0;
  const lon = uav.uav_lon ?? 0;
  const distanceKm = (uav.distance_m ?? 0) / 1000;
  const altM = uav.alt_asl_m ?? uav.alt_agl_m ?? 0;
  const altitudeFt = Math.round(altM * 3.28084);

  return {
    id: uav.target_uid ?? `det-${eventId ?? Date.now()}`,
    classification: "UNKNOWN",
    distanceKm,
    altitude: altitudeFt,
    frequencyMHz: (uav.freq_khz ?? 0) / 1000,
    rssi: uav.signal_db ?? 0,
    heading: uav.azimuth_deg ?? 0,
    coordinates: [lon, lat],
    speedKmH: uav.speed_mps ? uav.speed_mps * 3.6 : undefined,
    deviceId,
    eventId,
  };
}

export const useTargetsStore = create<TargetsState>((set) => ({
  targets: [],

  setTargets: (targets) => {
    const byId = new Map<string, Target>();
    for (const t of targets) byId.set(t.id, t);
    set({ targets: [...byId.values()] });
  },

  addOrUpdateTarget: (target) =>
    set((state) => {
      const idx = state.targets.findIndex((t) => t.id === target.id);
      const next =
        idx >= 0
          ? state.targets.map((t, i) => (i === idx ? { ...t, ...target } : t))
          : [...state.targets, target];
      return { targets: next };
    }),

  reclassifyTarget: (id, classification) =>
    set((state) => ({
      targets: state.targets.map((t) =>
        t.id === id ? { ...t, classification } : t,
      ),
    })),

  clearTargets: () => set({ targets: [] }),
}));
