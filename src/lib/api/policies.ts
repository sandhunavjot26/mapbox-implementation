/**
 * Policies API — command policies (approvals, auto_send, timeout).
 * Per AeroShield Live Operations Guide Section 9:
 * GET /api/v1/policies — list policies
 * PATCH /api/v1/policies/{command_type} — update policy
 */

import { apiJson } from "./client";

export interface CommandPolicy {
  command_type: string;
  required_approvals: number;
  auto_send: boolean;
  timeout_seconds: number;
}

/** GET /api/v1/policies — list all command policies */
export async function listPolicies(): Promise<CommandPolicy[]> {
  return apiJson<CommandPolicy[]>("command", "/api/v1/policies");
}

/** PATCH /api/v1/policies/{command_type} — update policy */
export async function updatePolicy(
  commandType: string,
  payload: Partial<Pick<CommandPolicy, "required_approvals" | "auto_send" | "timeout_seconds">>
): Promise<CommandPolicy> {
  return apiJson<CommandPolicy>("command", `/api/v1/policies/${encodeURIComponent(commandType)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
