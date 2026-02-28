/**
 * Map Actions Store — Zustand store for intercepts, target actions, and engagement log.
 * Migrated from custom pub/sub to Zustand for consistency with other stores.
 *
 * Usage:
 *   const intercepts = useMapActionsStore((s) => s.intercepts);
 *   const { reclassifyTarget, confirmThreat, addIntercept } = useMapActionsStore.getState();
 */

import { create } from "zustand";
import type { Target } from "@/types/targets";

export type InterceptState = "vectoring" | "engaging" | "neutralized";

export interface Intercept {
  targetId: string;
  assetId: string;
  state: InterceptState;
  startedAt: number;
  completedAt?: number;
}

export interface EngagementLogEntry {
  targetId: string;
  assetId: string;
  startedAt: number;
  completedAt: number;
}

type ReclassifyHandler = (
  id: string,
  classification: Target["classification"],
) => void;
type ConfirmThreatHandler = (id: string) => void;

interface MapActionsState {
  // --- Intercepts ---
  intercepts: Intercept[];
  addIntercept: (targetId: string, assetId: string) => void;

  // --- Computed targets (from MapContainer) ---
  computedTargets: (Target & { confirmed?: boolean })[];
  setComputedTargets: (targets: (Target & { confirmed?: boolean })[]) => void;

  // --- Pulse targets (briefly highlighted) ---
  pulseTargetIds: string[];
  addPulseTarget: (id: string) => void;

  // --- Engagement log ---
  engagementLog: EngagementLogEntry[];

  // --- Map action handlers (registered by MapContainer) ---
  _reclassifyHandler: ReclassifyHandler | null;
  _confirmThreatHandler: ConfirmThreatHandler | null;
  registerMapActions: (handlers: {
    reclassifyTarget: ReclassifyHandler;
    confirmThreat: ConfirmThreatHandler;
  }) => void;
}

export const useMapActionsStore = create<MapActionsState>((set, get) => ({
  // --- State ---
  intercepts: [],
  computedTargets: [],
  pulseTargetIds: [],
  engagementLog: [],
  _reclassifyHandler: null,
  _confirmThreatHandler: null,

  // --- Actions ---
  registerMapActions: (handlers) =>
    set({
      _reclassifyHandler: handlers.reclassifyTarget,
      _confirmThreatHandler: handlers.confirmThreat,
    }),

  setComputedTargets: (targets) => set({ computedTargets: targets }),

  addPulseTarget: (id) => {
    const current = get().pulseTargetIds;
    if (current.includes(id)) return;
    set({ pulseTargetIds: [...current, id] });
    setTimeout(() => {
      set((s) => ({
        pulseTargetIds: s.pulseTargetIds.filter((x) => x !== id),
      }));
    }, 2000);
  },

  addIntercept: (targetId, assetId) => {
    const intercept: Intercept = {
      targetId,
      assetId,
      state: "vectoring",
      startedAt: Date.now(),
    };
    set((s) => ({ intercepts: [...s.intercepts, intercept] }));

    // State progression: vectoring -> engaging (3s) -> neutralized (8s)
    setTimeout(() => {
      set((s) => ({
        intercepts: s.intercepts.map((i) =>
          i.targetId === targetId ? { ...i, state: "engaging" as const } : i,
        ),
      }));
    }, 3000);
    setTimeout(() => {
      set((s) => {
        const updated = s.intercepts.map((i) =>
          i.targetId === targetId
            ? {
                ...i,
                state: "neutralized" as const,
                completedAt: Date.now(),
              }
            : i,
        );
        const completed = updated.find(
          (i) => i.targetId === targetId && i.state === "neutralized",
        );
        const newLog = completed?.completedAt
          ? [
              {
                targetId,
                assetId: completed.assetId,
                startedAt: completed.startedAt,
                completedAt: completed.completedAt,
              },
              ...s.engagementLog,
            ].slice(0, 50)
          : s.engagementLog;

        return { intercepts: updated, engagementLog: newLog };
      });
    }, 8000);
  },
}));

// --- Convenience selectors & actions (backward-compatible API) ---

/** Register map action handlers from MapContainer */
export function registerMapActions(handlers: {
  reclassifyTarget: ReclassifyHandler;
  confirmThreat: ConfirmThreatHandler;
}) {
  useMapActionsStore.getState().registerMapActions(handlers);
}

/** Reclassify a target (delegates to MapContainer handler) */
export function reclassifyTarget(
  id: string,
  classification: Target["classification"],
) {
  useMapActionsStore.getState()._reclassifyHandler?.(id, classification);
}

/** Confirm a threat (delegates to MapContainer handler) */
export function confirmThreat(id: string) {
  useMapActionsStore.getState()._confirmThreatHandler?.(id);
}

/** Set computed targets from MapContainer */
export function setComputedTargets(
  targets: (Target & { confirmed?: boolean })[],
) {
  useMapActionsStore.getState().setComputedTargets(targets);
}

/** Get computed targets */
export function getComputedTargets() {
  return useMapActionsStore.getState().computedTargets;
}

/** Add a pulse highlight to a target */
export function addPulseTarget(id: string) {
  useMapActionsStore.getState().addPulseTarget(id);
}

/** Get pulse target IDs */
export function getPulseTargetIds() {
  return useMapActionsStore.getState().pulseTargetIds;
}

/** Add an intercept entry */
export function addIntercept(targetId: string, assetId: string) {
  useMapActionsStore.getState().addIntercept(targetId, assetId);
}

/** Get all intercepts */
export function getIntercepts() {
  return useMapActionsStore.getState().intercepts;
}

/** Get intercept stats */
export function getInterceptStats() {
  const intercepts = useMapActionsStore.getState().intercepts;
  const neutralized = intercepts.filter(
    (i) => i.state === "neutralized",
  ).length;
  const confirmed = intercepts.length;
  const successRate =
    confirmed > 0 ? Math.round((neutralized / confirmed) * 100) : 0;
  return { neutralized, confirmed, successRate };
}

/** Get IDs of neutralized targets */
export function getNeutralizedTargetIds(): string[] {
  return useMapActionsStore
    .getState()
    .intercepts.filter((i) => i.state === "neutralized")
    .map((i) => i.targetId);
}

/** Get engagement log */
export function getEngagementLog() {
  return useMapActionsStore.getState().engagementLog;
}

// --- Subscribe helpers (for non-React consumers — backward compatible) ---

export function subscribeToComputedTargets(
  cb: (targets: (Target & { confirmed?: boolean })[]) => void,
) {
  cb(useMapActionsStore.getState().computedTargets);
  return useMapActionsStore.subscribe((s) => cb(s.computedTargets));
}

export function subscribeToPulseTargets(cb: (ids: string[]) => void) {
  cb(useMapActionsStore.getState().pulseTargetIds);
  return useMapActionsStore.subscribe((s) => cb(s.pulseTargetIds));
}

export function subscribeToIntercepts(cb: (intercepts: Intercept[]) => void) {
  cb(useMapActionsStore.getState().intercepts);
  return useMapActionsStore.subscribe((s) => cb(s.intercepts));
}

export function subscribeToEngagementLog(
  cb: (log: EngagementLogEntry[]) => void,
) {
  cb(useMapActionsStore.getState().engagementLog);
  return useMapActionsStore.subscribe((s) => cb(s.engagementLog));
}
