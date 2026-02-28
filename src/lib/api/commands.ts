/**
 * Commands API — create, approve, reject, list.
 * POST /api/v1/commands — create command
 * POST /api/v1/commands/{id}/approve — approve
 * POST /api/v1/commands/{id}/reject — reject
 * GET /api/v1/commands?mission_id=&status= — list commands (per AeroShield doc)
 */

import { apiJson } from "./client";
import type { CommandRequest, CommandOut } from "@/types/aeroshield";

/** GET /api/v1/commands?mission_id=&status= — list commands for mission */
export async function listCommands(
  missionId: string,
  status?: string
): Promise<CommandOut[]> {
  const params = new URLSearchParams({ mission_id: missionId });
  if (status) params.set("status", status);
  return apiJson<CommandOut[]>("command", `/api/v1/commands?${params}`);
}

/** POST /api/v1/commands — create command (TRACK, ENGAGE, etc.) */
export async function createCommand(payload: CommandRequest): Promise<CommandOut> {
  return apiJson<CommandOut>("command", "/api/v1/commands", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /api/v1/commands/{id}/approve */
export async function approveCommand(
  commandId: string,
  reason?: string
): Promise<{ status: string; approved_count: number; required: number; command_status: string }> {
  return apiJson("command", `/api/v1/commands/${commandId}/approve`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? "" }),
  });
}

/** POST /api/v1/commands/{id}/reject */
export async function rejectCommand(
  commandId: string,
  reason: string
): Promise<{ status: string }> {
  return apiJson("command", `/api/v1/commands/${commandId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
