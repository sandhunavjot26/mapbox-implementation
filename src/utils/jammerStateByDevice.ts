/**
 * Fold per-device jammer ON/OFF from recent command audit rows (JAM_START / JAM_STOP / ATTACK_MODE_SET).
 * Mirrors old-ui radioBands.jammerStateByDevice behaviour.
 */

export type JammerState = "ON" | "OFF" | "UNKNOWN";

export type JammerCommandRow = {
  device_id?: string | null;
  command_type: string;
  status: string;
  request_payload?: unknown;
  completed_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
};

export function jammerStateByDevice(commands: JammerCommandRow[]): Record<string, JammerState> {
  const byDev: Record<string, { state: JammerState; at: string }> = {};
  for (const c of commands) {
    if (!c.device_id) continue;
    if (c.status !== "SUCCEEDED" && c.status !== "SENT" && c.status !== "SENDING") continue;
    let next: JammerState | null = null;
    if (c.command_type === "JAM_START") next = "ON";
    else if (c.command_type === "JAM_STOP") next = "OFF";
    else if (c.command_type === "ATTACK_MODE_SET") {
      const sw = Number((c.request_payload as { switch?: number } | null)?.switch);
      next = sw === 1 ? "ON" : sw === 0 ? "OFF" : null;
    }
    if (next == null) continue;
    const at = c.completed_at || c.sent_at || c.created_at || "";
    const prev = byDev[c.device_id];
    if (!prev || prev.at < at) {
      byDev[c.device_id] = { state: next, at };
    }
  }
  const out: Record<string, JammerState> = {};
  for (const [id, v] of Object.entries(byDev)) out[id] = v.state;
  return out;
}
