/**
 * Mission events store — timeline entries from WebSocket (DETECTED, JAM_STARTED, COMMAND_*).
 * Per AeroShield Live Operations Guide Section 6: device-service broadcasts mission events over WS.
 * Timeline panel shows these immediately.
 */

import { create } from "zustand";

export interface MissionEventEntry {
  id: string;
  mission_id: string;
  device_id: string | null;
  event_type: string;
  ts: string;
  payload: Record<string, unknown> | null;
  receivedAt: number;
  /**
   * When true, UI must not show a toast for this row (e.g. REST timeline backfill).
   * Omitted = false. WebSocket `addEvent` does not set this.
   */
  suppressToast?: boolean;
}

const MAX_EVENTS = 500;

type AddEventInput = Omit<MissionEventEntry, "receivedAt" | "suppressToast"> & {
  /** If true, skip alert toast (bulk REST backfill, etc.) */
  silent?: boolean;
};

interface MissionEventsState {
  events: MissionEventEntry[];
  addEvent: (event: AddEventInput) => void;
  clearEvents: () => void;
}

export const useMissionEventsStore = create<MissionEventsState>((set) => ({
  events: [],

  addEvent: (event) =>
    set((state) => {
      const { silent, ...rest } = event;
      const entry: MissionEventEntry = {
        ...rest,
        receivedAt: Date.now(),
        suppressToast: silent === true,
      };
      const exists = state.events.some((e) => e.id === event.id);
      const next = exists
        ? state.events.map((e) => (e.id === event.id ? entry : e))
        : [entry, ...state.events].slice(0, MAX_EVENTS);
      return { events: next };
    }),

  clearEvents: () => set({ events: [] }),
}));
