/**
 * Targets store — live detections from events (WebSocket or REST).
 * Per rules: live telemetry not in React state; Mapbox reads from this store.
 * Classification: default UNKNOWN; client-side reclassification only.
 */

import { create } from "zustand";
import type { DetectedUavPayload, TrackUpdatePayload } from "@/types/aeroshield";
import type { Target, TargetClassification } from "@/types/targets";

// Re-export for backward compatibility
export type { Target, TargetClassification };

/**
 * Map TRACK_UPDATE flat payload to Target.
 * Used for continuous position updates; addOrUpdateTarget merges with existing target.
 * TRACK_UPDATE uses lat/lon directly (unlike DETECTED which uses uav_lat/uav_lon).
 * Provides defaults for fields not in TRACK_UPDATE (classification, altitude, etc.).
 */
export function trackUpdatePayloadToTarget(payload: TrackUpdatePayload): Target {
  const lat = payload.lat ?? 0;
  const lon = payload.lon ?? 0;
  const distanceKm = (payload.distance_m ?? 0) / 1000;
  const heading = payload.heading_deg ?? payload.azimuth_deg ?? 0;
  const speedKmH = payload.speed_mps != null ? payload.speed_mps * 3.6 : undefined;

  return {
    id: payload.target_uid,
    classification: "UNKNOWN",
    distanceKm,
    altitude: 0,
    frequencyMHz: 0,
    rssi: 0,
    heading,
    coordinates: [lon, lat],
    speedKmH,
    targetName: payload.target_name,
    confidence: payload.confidence,
    lastSeenAt: Date.now(),
  };
}

/** Max positions to keep per target for track trail */
export const TRACK_TRAIL_LENGTH = 50;

interface TargetsState {
  targets: Target[];
  /** Per-target position history [lng, lat][] for track trail LineStrings */
  positionHistory: Record<string, [number, number][]>;
  setTargets: (targets: Target[]) => void;
  addOrUpdateTarget: (target: Target) => void;
  removeTarget: (id: string) => void;
  markTargetLost: (id: string) => void;
  reclassifyTarget: (id: string, classification: TargetClassification) => void;
  clearTargets: () => void;
  getPositionHistory: (targetId: string) => [number, number][];
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

  const rcCoords: [number, number] | undefined =
    uav.rc_lon != null && uav.rc_lat != null ? [uav.rc_lon, uav.rc_lat] : undefined;

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
    targetName: uav.target_name,
    confidence: uav.confidence,
    lastSeenAt: Date.now(),
    bandwidthMHz: uav.bandwidth_khz != null ? uav.bandwidth_khz / 1000 : undefined,
    rcCoords,
  };
}

function appendPosition(
  history: [number, number][],
  coord: [number, number],
  maxLen: number,
): [number, number][] {
  const last = history[history.length - 1];
  if (last && last[0] === coord[0] && last[1] === coord[1]) return history;
  const next = [...history, coord];
  return next.length > maxLen ? next.slice(-maxLen) : next;
}

export const useTargetsStore = create<TargetsState>((set, get) => ({
  targets: [],
  positionHistory: {},

  setTargets: (targets) => {
    const byId = new Map<string, Target>();
    for (const t of targets) byId.set(t.id, t);
    const ids = new Set(byId.keys());
    set((state) => ({
      targets: [...byId.values()],
      positionHistory: Object.fromEntries(
        Object.entries(state.positionHistory).filter(([id]) => ids.has(id)),
      ),
    }));
  },

  addOrUpdateTarget: (target) =>
    set((state) => {
      const idx = state.targets.findIndex((t) => t.id === target.id);
      const existing = idx >= 0 ? state.targets[idx] : undefined;
      const merged = {
        ...target,
        lastSeenAt: Date.now(),
        lost: false,
        classification:
          target.classification === "UNKNOWN" && existing
            ? existing.classification
            : target.classification,
      };
      const coord = target.coordinates;
      const prevHistory = state.positionHistory[target.id] ?? [];
      const newHistory = appendPosition(
        prevHistory,
        coord,
        TRACK_TRAIL_LENGTH,
      );
      const nextTargets =
        idx >= 0
          ? state.targets.map((t, i) => (i === idx ? { ...t, ...merged } : t))
          : [...state.targets, merged];
      return {
        targets: nextTargets,
        positionHistory: {
          ...state.positionHistory,
          [target.id]: newHistory,
        },
      };
    }),

  removeTarget: (id) =>
    set((state) => ({
      targets: state.targets.filter((t) => t.id !== id),
      positionHistory: (() => {
        const next = { ...state.positionHistory };
        delete next[id];
        return next;
      })(),
    })),

  markTargetLost: (id) =>
    set((state) => ({
      targets: state.targets.map((t) =>
        t.id === id ? { ...t, lost: true } : t,
      ),
    })),

  reclassifyTarget: (id, classification) =>
    set((state) => ({
      targets: state.targets.map((t) =>
        t.id === id ? { ...t, classification } : t,
      ),
    })),

  clearTargets: () => set({ targets: [], positionHistory: {} }),

  getPositionHistory: (targetId) =>
    get().positionHistory[targetId] ?? [],
}));
