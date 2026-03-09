/**
 * Commands store — live command status from WebSocket (SENDING → SENT → SUCCEEDED/FAILED).
 * Per AeroShield Live Operations Guide Section 5: command_update pushes status in real time.
 * Extended with packet_no, created_at, result_payload for RecentCommands panel.
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
  /** Packet number from command-service (for display) */
  packet_no?: number | null;
  /** ISO timestamp when command was created (from REST response or first WS message) */
  created_at?: string;
  /** Result payload from SUCCEEDED response (for preview in RecentCommands) */
  result_payload?: Record<string, unknown> | null;
  /** Target ID when Engage (ATTACK_MODE_SET) was sent — for status overlay */
  engaged_target_id?: string | null;
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
      // Preserve created_at from first add (REST response); allow result_payload from WS
      const entry: CommandWithStatus = {
        mission_id: "",
        device_id: null,
        command_type: "",
        status: "PENDING",
        ...base,
        ...cmdRest,
        created_at: cmdRest.created_at ?? (base as CommandWithStatus).created_at,
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
