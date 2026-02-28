/**
 * Command list per AeroShield Live Operations Guide Section 8.
 * Grouped: Query (auto-send), Operational, High-risk/Jammer, Turntable, Network.
 */

export interface CommandDef {
  id: string;
  label: string;
  group: "query" | "operational" | "high_risk" | "turntable" | "network";
  datatype?: number;
  payloadSchema?: string;
  dangerous?: boolean;
}

/** Query commands (safe, auto-send) */
export const QUERY_COMMANDS: CommandDef[] = [
  { id: "IP_QUERY", label: "IP Query", group: "query", datatype: 27 },
  { id: "GATEWAY_QUERY", label: "Gateway Query", group: "query", datatype: 54 },
  { id: "ATTACK_MODE_QUERY", label: "Attack Mode Query", group: "query", datatype: 102 },
  { id: "BAND_RANGE_QUERY", label: "Band Range Query", group: "query", datatype: 98 },
  { id: "ALARM_HISTORY_QUERY", label: "Alarm History Query", group: "query", datatype: 116 },
];

/** Operational commands (low-risk; optional approvals) */
export const OPERATIONAL_COMMANDS: CommandDef[] = [
  { id: "RESTART", label: "Restart", group: "operational", datatype: 29 },
  { id: "SET_TIME", label: "Set Time", group: "operational", datatype: 16 },
];

/** High-risk / jammer-affecting (policy-controlled) */
export const HIGH_RISK_COMMANDS: CommandDef[] = [
  { id: "ATTACK_MODE_SET", label: "Attack Mode Set", group: "high_risk", datatype: 100, payloadSchema: "{mode, switch}" },
  { id: "JAM_START", label: "Jam Start", group: "high_risk", datatype: 100, payloadSchema: "{mode, switch:1}" },
  { id: "JAM_STOP", label: "Jam Stop", group: "high_risk", datatype: 100, payloadSchema: "{mode, switch:0}" },
  { id: "BAND_RANGE_SET", label: "Band Range Set", group: "high_risk", datatype: 96, payloadSchema: "JSON array" },
];

/** Turntable commands */
export const TURNTABLE_COMMANDS: CommandDef[] = [
  { id: "TURNTABLE_DIR", label: "Turntable Direction", group: "turntable", datatype: 142, payloadSchema: "{direction, speed}" },
  { id: "TURNTABLE_POINT", label: "Turntable Point", group: "turntable", datatype: 144, payloadSchema: "{h_enable, horizontal, v_enable, vertical}" },
];

/** Network maintenance (dangerous; approval recommended) */
export const NETWORK_COMMANDS: CommandDef[] = [
  { id: "IP_SET", label: "IP Set", group: "network", datatype: 25, payloadSchema: "{ip,port,netmask,route,dns}", dangerous: true },
  { id: "GATEWAY_SET", label: "Gateway Set", group: "network", datatype: 52, payloadSchema: "{ip, reserve}", dangerous: true },
];

export const ALL_COMMANDS: CommandDef[] = [
  ...QUERY_COMMANDS,
  ...OPERATIONAL_COMMANDS,
  ...HIGH_RISK_COMMANDS,
  ...TURNTABLE_COMMANDS,
  ...NETWORK_COMMANDS,
];

/** Target-specific commands (map to document commands) */
export const TARGET_COMMANDS = [
  { id: "TURNTABLE_POINT", label: "Track" },   // TRACK → TURNTABLE_POINT
  { id: "CLASSIFY", label: "Classify" },       // client-side only
  { id: "WARN", label: "Warn" },               // future
  { id: "JAM_START", label: "Engage" },        // ENGAGE → JAM_START
];
