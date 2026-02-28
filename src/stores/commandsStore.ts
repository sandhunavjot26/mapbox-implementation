/**
 * Commands store — live command status from WebSocket (SENDING → SENT → SUCCEEDED/FAILED).
 * Per AeroShield Live Operations Guide Section 5: command_update pushes status in real time.
 */

import { create } from "zustand";

export interface CommandWithStatus {
  id: string;
  mission_id: string;
  device_id: string | null;
  command_type: string;
  status: string;
  approved_count?: number;
  required_approvals?: number;
  last_error?: string | null;
  updatedAt: number;
}

const MAX_COMMANDS = 50;

interface CommandsState {
  commands: CommandWithStatus[];
  addOrUpdateCommand: (cmd: Partial<CommandWithStatus> & { id: string }) => void;
  clearCommands: () => void;
}

export const useCommandsStore = create<CommandsState>((set) => ({
  commands: [],

  addOrUpdateCommand: (cmd) =>
    set((state) => {
      const idx = state.commands.findIndex((c) => c.id === cmd.id);
      const base = idx >= 0 ? state.commands[idx] : {};
      const { updatedAt: _omit, ...cmdRest } = cmd;
      const entry: CommandWithStatus = {
        mission_id: "",
        device_id: null,
        command_type: "",
        status: "PENDING",
        ...base,
        ...cmdRest,
        updatedAt: Date.now(),
      };
      const next =
        idx >= 0
          ? state.commands.map((c, i) => (i === idx ? entry : c))
          : [entry, ...state.commands].slice(0, MAX_COMMANDS);
      return { commands: next };
    }),

  clearCommands: () => set({ commands: [] }),
}));
