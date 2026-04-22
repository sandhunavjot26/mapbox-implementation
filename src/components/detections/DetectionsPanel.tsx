"use client";

/**
 * Detections side panel (dashboard bell) — same live list as old-ui
 * @/old-ui/.../DetectionsPanel: tracks grouped by radar. Visual shell uses
 * driif tokens; data from targetsStore (WebSocket) + mission devices.
 */

import { useMissionStore } from "@/stores/missionStore";
import { MissionDetectionsList } from "@/components/detections/MissionDetectionsList";
import { COLOR, FONT } from "@/styles/driifTokens";

const PANEL_W = 510;

export function DetectionsPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const cachedMission = useMissionStore((s) => s.cachedMission);
  const devices = cachedMission?.devices;

  return (
    <div
      role="dialog"
      aria-labelledby="detections-panel-title"
      aria-modal="false"
      className="driif-mission-scrollbar flex max-h-[calc(100vh-96px)] min-h-0 flex-col overflow-y-auto"
      style={{
        width: embedded ? "100%" : PANEL_W,
        maxWidth: "100%",
        minWidth: 0,
        background: embedded ? "transparent" : COLOR.missionsPanelBg,
        fontFamily: `${FONT.family}, sans-serif`,
        gap: 0,
      }}
    >
      <h2
        id="detections-panel-title"
        className="sr-only"
      >
        Detections
      </h2>
      <MissionDetectionsList devices={devices} compact={!embedded} />
    </div>
  );
}
