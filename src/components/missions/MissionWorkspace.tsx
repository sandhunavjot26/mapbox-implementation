"use client";

/**
 * Mission workspace — map, panels, command console when mission is active.
 * Uses map features from API, targets from WebSocket/REST, devices from mission.
 */

import { useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StatusBadge } from "@/components/status/StatusBadge";
import { AssetsPanel } from "@/components/panels/AssetsPanel";
import { TrackingPanel } from "@/components/panels/TrackingPanel";
import { EngagementLog } from "@/components/panels/EngagementLog";
import { MissionTimeline } from "@/components/panels/MissionTimeline";
import { RecentCommands } from "@/components/panels/RecentCommands";
import { WsStatusIndicator } from "@/components/status/WsStatusIndicator";
import {
  subscribeToIntercepts,
  getInterceptStats,
} from "@/stores/mapActionsStore";
import { useMissionStore } from "@/stores/missionStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useMapFeatures, useMissionLoad } from "@/hooks/useMissions";
import { useMissionSockets } from "@/hooks/useMissionSockets";
import { useMissionEvents } from "@/hooks/useMissionEvents";
import { mapFeaturesToAssetsGeoJSON } from "@/utils/mapFeatures";
import type { Asset } from "@/types/assets";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-900/30 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-500 animate-pulse" />
          <span className="text-slate-500 text-xs font-mono tracking-widest uppercase">
            Loading Map...
          </span>
        </div>
      </div>
    ),
  },
);

const EntityHoverPopup = dynamic(
  () =>
    import("@/components/map/overlays/EntityHoverPopup").then(
      (mod) => mod.EntityHoverPopup,
    ),
  { ssr: false },
);

interface MissionWorkspaceProps {
  missionId: string;
  assetsCollapsed: boolean;
  trackingCollapsed: boolean;
  mapMode: "2D" | "3D";
  onAssetsToggle: () => void;
  onTrackingToggle: () => void;
  onBackToMissions: () => void;
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
  mapMode,
  onAssetsToggle,
  onTrackingToggle,
  onBackToMissions,
}: MissionWorkspaceProps) {
  const [interceptStats, setInterceptStats] = useState({
    neutralized: 0,
    confirmed: 0,
    successRate: 0,
  });

  const { data: missionData } = useMissionLoad(missionId, true);
  const { data: mapFeatures } = useMapFeatures(missionId, true);
  const wsStatus = useMissionSockets();
  useMissionEvents(missionId, true, wsStatus.eventsStatus !== "open");

  const setCachedMission = useMissionStore((s) => s.setCachedMission);
  const storedCachedMission = useMissionStore((s) => s.cachedMission);
  useEffect(() => {
    if (missionData) setCachedMission(missionData);
  }, [missionData, setCachedMission]);

  const cachedMission = missionData ?? storedCachedMission;
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);

  useEffect(() => {
    return subscribeToIntercepts(() => {
      setInterceptStats(getInterceptStats());
    });
  }, []);

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
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <EntityHoverPopup />
      <div className="flex-1 flex overflow-hidden">
        <ErrorBoundary label="Assets Panel">
          <AssetsPanel
            assets={assets}
            collapsed={assetsCollapsed}
            onToggle={onAssetsToggle}
          />
        </ErrorBoundary>
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <ErrorBoundary label="Map">
              <MapContainer
                mapMode={mapMode}
                missionId={missionId}
                mapFeatures={mapFeatures}
              />
            </ErrorBoundary>
          </div>
          <ErrorBoundary label="Recent Commands">
            <RecentCommands />
          </ErrorBoundary>
          <ErrorBoundary label="Timeline">
            <MissionTimeline />
          </ErrorBoundary>
          <ErrorBoundary label="Engagement Log">
            <EngagementLog />
          </ErrorBoundary>
          <div className="shrink-0 border-t border-slate-800 bg-slate-950/50 px-4 py-2">
            <div className="flex items-center justify-center gap-8">
              <StatusBadge color="red" label="REAL-TIME DATA AGGREGATION" />
              <StatusBadge
                color="amber"
                label="COMMON OPERATIONAL PICTURE (COP)"
              />
              <StatusBadge color="green" label="THREAT PROFILING" />
              <StatusBadge color="cyan" label="COUNTER-UAS EFFECTORS" />
            </div>
          </div>
        </main>
        <ErrorBoundary label="Tracking Panel">
          <TrackingPanel
            collapsed={trackingCollapsed}
            onToggle={onTrackingToggle}
            useApiTargets
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
