/**
 * WebSocket status store — shared connection statuses for header UI.
 * Updated by useMissionSockets; read by DashboardPage header.
 * Prevents needing to call useMissionSockets in multiple components (which would create duplicate connections).
 */

import { create } from "zustand";

export type WsStatus = "connecting" | "open" | "closed" | "error";

interface WsStatusState {
  eventsStatus: WsStatus;
  devicesStatus: WsStatus;
  commandsStatus: WsStatus;
  setStatuses: (s: {
    eventsStatus: WsStatus;
    devicesStatus: WsStatus;
    commandsStatus: WsStatus;
  }) => void;
}

export const useWsStatusStore = create<WsStatusState>((set) => ({
  eventsStatus: "closed",
  devicesStatus: "closed",
  commandsStatus: "closed",

  setStatuses: (s) => set(s),
}));
