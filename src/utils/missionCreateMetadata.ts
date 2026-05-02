/**
 * Build mission `aop` (area of operations / planning summary) from create-mission UI.
 * Backend stores a single string; we concatenate structured metadata the operator entered.
 */

import type { MissionType } from "@/types/missionCreate";

export function buildMissionAopFromCreateForm(params: {
  commandUnit: string;
  missionType: MissionType;
  startAt: string;
  endAt: string;
}): string {
  const { commandUnit, missionType, startAt, endAt } = params;
  return [
    `Unit: ${commandUnit.trim() || "—"}`,
    `Type: ${missionType}`,
    `Window: ${startAt.trim() || "—"} → ${endAt.trim() || "—"}`,
  ].join(" · ");
}
