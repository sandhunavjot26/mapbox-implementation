/**
 * Engage overlay store — floating "Command delivered" / "Jam active" near target.
 * Set when ATTACK_MODE_SET command succeeds (from useMissionSockets).
 */

import { create } from "zustand";

export interface EngageOverlayState {
  targetId: string;
  message: string;
  expiresAt: number;
}

interface EngageOverlayStoreState {
  overlay: EngageOverlayState | null;
  setOverlay: (state: EngageOverlayState | null) => void;
}

const OVERLAY_DURATION_MS = 5000;

export const useEngageOverlayStore = create<EngageOverlayStoreState>((set) => ({
  overlay: null,

  setOverlay: (state) =>
    set({
      overlay: state
        ? { ...state, expiresAt: Date.now() + OVERLAY_DURATION_MS }
        : null,
    }),
}));
