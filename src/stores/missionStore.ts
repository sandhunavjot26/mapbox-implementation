/**
 * Mission store — active mission ID for workspace.
 * Map/panels use this to know which mission's data to fetch and display.
 * Cached mission data is for UI only; map uses GeoJSON from API.
 */

import { create } from "zustand";
import type { MissionLoad } from "@/types/aeroshield";

interface MissionState {
  activeMissionId: string | null;
  cachedMission: MissionLoad | null;
  setActiveMission: (missionId: string | null) => void;
  setCachedMission: (mission: MissionLoad | null) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  activeMissionId: null,
  cachedMission: null,

  setActiveMission: (missionId) => set({ activeMissionId: missionId }),

  setCachedMission: (mission) => set({ cachedMission: mission }),
}));
