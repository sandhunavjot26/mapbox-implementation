/**
 * After mission create + device assign, apply per-radar Configure-step drafts.
 * Bearing / elevation live only on the command plane (TURNTABLE_POINT), not on PATCH /devices.
 * We best-effort send one command per device when the draft differs from defaults.
 */

import { createCommand } from "@/lib/api/commands";
import { defaultRadarConfigureDraft } from "@/lib/mock/radarConfigureDefaults";
import type { RadarConfigureDraft } from "@/types/radarMissionDraft";

function draftDiffersFromDefaults(
  deviceId: string,
  draft: RadarConfigureDraft,
): boolean {
  const def = defaultRadarConfigureDraft(deviceId);
  return (
    draft.horizontalBearingDeg !== def.horizontalBearingDeg ||
    draft.verticalElevationDeg !== def.verticalElevationDeg ||
    draft.mountHeightM !== def.mountHeightM
  );
}

export async function applyRadarConfigureDraftsAfterCreate(params: {
  missionId: string;
  deviceIds: string[];
  drafts: Record<string, RadarConfigureDraft>;
}): Promise<void> {
  const { missionId, deviceIds, drafts } = params;

  for (const deviceId of deviceIds) {
    const draft = drafts[deviceId];
    if (!draft || !draftDiffersFromDefaults(deviceId, draft)) continue;

    try {
      await createCommand({
        mission_id: missionId,
        device_id: deviceId,
        command_type: "TURNTABLE_POINT",
        payload: {
          h_enable: 1,
          horizontal: Math.round(draft.horizontalBearingDeg),
          v_enable: 1,
          vertical: Math.round(draft.verticalElevationDeg),
        },
      });
    } catch {
      if (process.env.NODE_ENV === "development") {
        // Device may not support turntable; mission create still succeeds.
        console.warn(
          "[applyRadarConfigureDraftsAfterCreate] TURNTABLE_POINT skipped for",
          deviceId,
        );
      }
    }
  }
}
