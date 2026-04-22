"use client";

/**
 * Mission workspace — panels and command context when a mission is active.
 * The shell is absolutely positioned in the dashboard (right rail, same anchor as detections);
 * this file only provides data + EngageOverlay + the tabbed panel.
 */

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useMissionLoad } from "@/hooks/useMissions";
import { useMissionSockets } from "@/hooks/useMissionSockets";
import { useMissionEvents } from "@/hooks/useMissionEvents";
import { useMissionStore } from "@/stores/missionStore";
import { MissionWorkspaceTabs } from "@/components/missions/MissionWorkspaceTabs";

const EngageOverlay = dynamic(
  () =>
    import("@/components/map/overlays/EngageOverlay").then(
      (mod) => mod.EngageOverlay,
    ),
  { ssr: false },
);

interface MissionWorkspaceProps {
  missionId: string;
  /** Return to the global map (no active mission) — same as clearing selection after login. */
  onDeselect: () => void;
}

export function MissionWorkspace({ missionId, onDeselect }: MissionWorkspaceProps) {
  const { data: missionData } = useMissionLoad(missionId, true);
  const wsStatus = useMissionSockets();
  useMissionEvents(missionId, true, wsStatus.eventsStatus !== "open");

  const setCachedMission = useMissionStore((s) => s.setCachedMission);
  const storedCachedMission = useMissionStore((s) => s.cachedMission);
  useEffect(() => {
    if (missionData) setCachedMission(missionData);
  }, [missionData, setCachedMission]);

  const cachedMission = missionData ?? storedCachedMission;

  const missionName = useMemo(() => {
    const t = (cachedMission?.name ?? "Mission").trim();
    return t || "Mission";
  }, [cachedMission?.name]);

  return (
    <>
      <EngageOverlay />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <MissionWorkspaceTabs
          missionName={missionName}
          cachedMission={cachedMission}
          onDeselect={onDeselect}
        />
      </div>
    </>
  );
}
