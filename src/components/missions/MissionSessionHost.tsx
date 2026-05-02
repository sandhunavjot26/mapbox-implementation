"use client";

/**
 * MissionSessionHost — mounts mission WebSocket, events, device-state
 * hydration, and data cache hooks whenever an active mission is set.
 * Also renders the map-level EngageOverlay (click-to-engage layer).
 * Intentionally renders no visible UI.
 */

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useMissionLoad } from "@/hooks/useMissions";
import { useMissionDeviceStatesHydration } from "@/hooks/useMissionDeviceStatesHydration";
import { useMissionSockets } from "@/hooks/useMissionSockets";
import { useMissionEvents } from "@/hooks/useMissionEvents";
import { useMissionStore } from "@/stores/missionStore";

const EngageOverlay = dynamic(
  () =>
    import("@/components/map/overlays/EngageOverlay").then(
      (mod) => mod.EngageOverlay,
    ),
  { ssr: false },
);

interface MissionSessionHostProps {
  missionId: string;
}

export function MissionSessionHost({ missionId }: MissionSessionHostProps) {
  const { data: missionData } = useMissionLoad(missionId, true);
  const wsStatus = useMissionSockets();
  useMissionDeviceStatesHydration(missionId, true);
  useMissionEvents(missionId, true, wsStatus.eventsStatus !== "open");

  const setCachedMission = useMissionStore((s) => s.setCachedMission);
  useEffect(() => {
    if (missionData) setCachedMission(missionData);
  }, [missionData, setCachedMission]);

  return <EngageOverlay />;
}
