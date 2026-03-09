/**
 * Attack mode store — per-device jam/attack state from ATTACK_MODE_QUERY.
 * Updated when command SUCCEEDED with result payload (dt103 or { mode, switch }).
 * Used for "Jam: ON" / "Idle" badge on device popups and AssetsPanel.
 */

import { create } from "zustand";

export interface AttackModeState {
  /** mode: 0=Expulsion, 1=ForcedLanding; switch: 0=Off, 1=On */
  mode?: number;
  switch?: number;
  /** Parsed from dt103 (12 switches) — if any switch is 1, jam is active */
  jamActive?: boolean;
  updatedAt: number;
}

interface AttackModeStoreState {
  byDeviceId: Record<string, AttackModeState>;
  setAttackMode: (deviceId: string, state: Omit<AttackModeState, "updatedAt">) => void;
  getAttackMode: (deviceId: string) => AttackModeState | undefined;
  clear: () => void;
}

/** Derive jamActive from result payload (dt103 or { mode, switch }) */
function parseJamActive(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload || typeof payload !== "object") return false;
  const sw = payload.switch ?? payload.sw;
  if (typeof sw === "number") return sw === 1;
  const switches = payload.switches as number[] | undefined;
  if (Array.isArray(switches)) return switches.some((s) => s === 1);
  for (let i = 0; i < 12; i++) {
    const v = payload[`switch_${i}`] ?? payload[`switch${i}`];
    if (v === 1) return true;
  }
  return false;
}

export const useAttackModeStore = create<AttackModeStoreState>((set, get) => ({
  byDeviceId: {},

  setAttackMode: (deviceId, state) =>
    set((prev) => {
      const payload = state as unknown as Record<string, unknown>;
      const jamActive = "jamActive" in state && typeof state.jamActive === "boolean"
        ? state.jamActive
        : parseJamActive(payload);
      return {
        byDeviceId: {
          ...prev.byDeviceId,
          [deviceId]: {
            mode: state.mode,
            switch: state.switch,
            jamActive,
            updatedAt: Date.now(),
          },
        },
      };
    }),

  getAttackMode: (deviceId) => get().byDeviceId[deviceId],

  clear: () => set({ byDeviceId: {} }),
}));
