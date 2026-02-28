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
}

const MAX_EVENTS = 100;

interface MissionEventsState {
  events: MissionEventEntry[];
  addEvent: (event: Omit<MissionEventEntry, "receivedAt">) => void;
  clearEvents: () => void;
}

export const useMissionEventsStore = create<MissionEventsState>((set) => ({
  events: [],

  addEvent: (event) =>
    set((state) => {
      const entry: MissionEventEntry = { ...event, receivedAt: Date.now() };
      const exists = state.events.some((e) => e.id === event.id);
      const next = exists
        ? state.events.map((e) => (e.id === event.id ? entry : e))
        : [entry, ...state.events].slice(0, MAX_EVENTS);
      return { events: next };
    }),

  clearEvents: () => set({ events: [] }),
}));
