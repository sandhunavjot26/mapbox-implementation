import type { Target } from "@/types/targets";
import { createCommand } from "@/lib/api/commands";
import { useCommandsStore } from "@/stores/commandsStore";
import { confirmThreat } from "@/stores/mapActionsStore";
import { formatCommandError } from "@/lib/formatCommandError";

/**
 * Full engage: map intercept / sim (confirmThreat) + ATTACK_MODE_SET when mission + device exist.
 * Matches prior TargetPopupControls.handleEngage behavior.
 */
export async function executeEngageJam(
  target: Target,
  missionId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  confirmThreat(target.id);

  if (!missionId) return { ok: true };

  const deviceId = target.deviceId;
  if (!deviceId) return { ok: true };

  try {
    const out = await createCommand({
      mission_id: missionId,
      device_id: deviceId,
      command_type: "ATTACK_MODE_SET",
      payload: { mode: 0, switch: 1 },
    });
    useCommandsStore.getState().addOrUpdateCommand({
      id: out.id,
      mission_id: out.mission_id,
      device_id: out.device_id,
      command_type: out.command_type,
      status: out.status,
      approved_count: out.approved_count,
      required_approvals: out.required_approvals,
      last_error: out.last_error,
      engaged_target_id: target.id,
      packet_no: out.packet_no ?? undefined,
      created_at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatCommandError(err) };
  }
}
