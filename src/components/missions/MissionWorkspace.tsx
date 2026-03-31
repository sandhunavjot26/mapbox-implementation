"use client";

/**
 * Mission workspace — map, panels, command console when mission is active.
 * Uses map features from API, targets from WebSocket/REST, devices from mission.
 */

import { useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { StatusBadge } from "@/components/status/StatusBadge";
import { AssetsPanel } from "@/components/panels/AssetsPanel";
import { TrackingPanel } from "@/components/panels/TrackingPanel";
import { EngagementLog } from "@/components/panels/EngagementLog";
import { MissionTimeline } from "@/components/panels/MissionTimeline";
import { RecentCommands } from "@/components/panels/RecentCommands";
import { useMissionStore } from "@/stores/missionStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useMissionLoad } from "@/hooks/useMissions";
import { useMissionSockets } from "@/hooks/useMissionSockets";
import { useMissionEvents } from "@/hooks/useMissionEvents";
import type { Asset } from "@/types/assets";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/** Set to `true` to show Assets (left) and Tracking (right) side rails during a mission. */
const SHOW_MISSION_SIDE_PANELS = false;

/** Map is rendered once at dashboard level; this workspace is panels only. */

const EngageOverlay = dynamic(
  () =>
    import("@/components/map/overlays/EngageOverlay").then(
      (mod) => mod.EngageOverlay,
    ),
  { ssr: false },
);

interface MissionWorkspaceProps {
  missionId: string;
  assetsCollapsed: boolean;
  trackingCollapsed: boolean;
  onAssetsToggle: () => void;
  onTrackingToggle: () => void;
}

/** Convert API devices to Asset-like for AssetsPanel. Merges real-time status from WebSocket when available. */
function devicesToAssets(
  devices: Array<{
    id: string;
    name?: string;
    serial_number?: string;
    latitude: number;
    longitude: number;
    status?: string;
    detection_radius_m?: number | null;
  }>,
  statusOverrides?: Record<string, string>,
): Asset[] {
  return devices.map((d) => {
    const wsStatus = statusOverrides?.[d.id];
    const rawStatus = wsStatus ?? d.status;
    const isActive =
      rawStatus === "ONLINE" || rawStatus === "WORKING" || rawStatus === "IDLE";
    return {
      id: d.id,
      name: (d as { name?: string }).name ?? d.serial_number ?? d.id,
      status: (isActive ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE",
      altitude: 0,
      area: "",
      coordinates: [d.longitude, d.latitude] as [number, number],
      coverageRadiusKm: (d.detection_radius_m ?? 2000) / 1000,
    };
  });
}

export function MissionWorkspace({
  missionId,
  assetsCollapsed,
  trackingCollapsed,
  onAssetsToggle,
  onTrackingToggle,
}: MissionWorkspaceProps) {
  const { data: missionData } = useMissionLoad(missionId, true);
  const wsStatus = useMissionSockets();
  useMissionEvents(missionId, true, wsStatus.eventsStatus !== "open");

  const setCachedMission = useMissionStore((s) => s.setCachedMission);
  const storedCachedMission = useMissionStore((s) => s.cachedMission);
  useEffect(() => {
    if (missionData) setCachedMission(missionData);
  }, [missionData, setCachedMission]);

  const cachedMission = missionData ?? storedCachedMission;
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);

  const assets = useMemo(() => {
    if (cachedMission?.devices?.length) {
      const overrides: Record<string, string> = {};
      Object.values(byDeviceId).forEach((e) => {
        overrides[e.device_id] = e.status;
      });
      return devicesToAssets(cachedMission.devices, overrides);
    }
    // No mock fallback — return empty until API data loads
    return [];
  }, [cachedMission?.devices, byDeviceId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 pointer-events-none">
      <EngageOverlay />
      <div className="flex-1 flex overflow-hidden min-h-0">
        {SHOW_MISSION_SIDE_PANELS && (
          <ErrorBoundary label="Assets Panel">
            <div className="pointer-events-auto h-full">
              <AssetsPanel
                assets={assets}
                collapsed={assetsCollapsed}
                onToggle={onAssetsToggle}
              />
            </div>
          </ErrorBoundary>
        )}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <div className="flex-1 min-h-0 min-w-0" aria-hidden />
          <div className="pointer-events-auto mx-16 md:mx-30 lg:mx-50 shrink-0">
            <ErrorBoundary label="Recent Commands">
              <RecentCommands />
            </ErrorBoundary>
            <ErrorBoundary label="Timeline">
              <MissionTimeline />
            </ErrorBoundary>
            <ErrorBoundary label="Engagement Log">
              <EngagementLog />
            </ErrorBoundary>
            <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-2">
              <div className="flex items-center justify-center gap-8 flex-wrap">
                <StatusBadge color="red" label="REAL-TIME DATA AGGREGATION" />
                {/* <StatusBadge
                  color="amber"
                  label="COMMON OPERATIONAL PICTURE (COP)"
                /> */}
                <StatusBadge color="green" label="THREAT PROFILING" />
                <StatusBadge color="cyan" label="COUNTER-UAS EFFECTORS" />
              </div>
            </div>
          </div>
        </main>
        {SHOW_MISSION_SIDE_PANELS && (
          <ErrorBoundary label="Tracking Panel">
            <div className="pointer-events-auto h-full">
              <TrackingPanel
                collapsed={trackingCollapsed}
                onToggle={onTrackingToggle}
                useApiTargets
              />
            </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
