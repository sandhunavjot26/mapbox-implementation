"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { StatusBadge } from "@/components/status/StatusBadge";
import { AssetsPanel } from "@/components/panels/AssetsPanel";
import { TrackingPanel } from "@/components/panels/TrackingPanel";
import { EngagementLog } from "@/components/panels/EngagementLog";
import { MissionSelector } from "@/components/missions/MissionSelector";
import { MissionWorkspace } from "@/components/missions/MissionWorkspace";
import { WsStatusIndicator } from "@/components/status/WsStatusIndicator";

import { CommandConsole } from "@/components/commands/CommandConsole";
import {
  subscribeToIntercepts,
  getInterceptStats,
} from "@/stores/mapActionsStore";
import { useAuthStore } from "@/stores/authStore";
import { logout } from "@/lib/api/auth";
import { useMissionStore } from "@/stores/missionStore";
import { useWsStatusStore } from "@/stores/wsStatusStore";

// Dynamic import to prevent SSR issues with Mapbox
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

// Dynamic import for hover popup (needs access to mapController)
const EntityHoverPopup = dynamic(
  () =>
    import("@/components/map/overlays/EntityHoverPopup").then(
      (mod) => mod.EntityHoverPopup,
    ),
  { ssr: false },
);

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);
  const [trackingCollapsed, setTrackingCollapsed] = useState(false);
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");
  const [interceptStats, setInterceptStats] = useState({
    neutralized: 0,
    confirmed: 0,
    successRate: 0,
  });

  useEffect(() => {
    return subscribeToIntercepts(() => {
      setInterceptStats(getInterceptStats());
    });
  }, []);

  const token = useAuthStore((s) => s.getToken());
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const setActiveMission = useMissionStore((s) => s.setActiveMission);
  // WS statuses from shared store — updated by MissionWorkspace's useMissionSockets hook
  const wsEventsStatus = useWsStatusStore((s) => s.eventsStatus);
  const wsDevicesStatus = useWsStatusStore((s) => s.devicesStatus);
  const wsCommandsStatus = useWsStatusStore((s) => s.commandsStatus);

  useEffect(() => {
    if (!token) {
      clearAuth(); // Clear stale cookie if sessionStorage empty
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router, token, clearAuth]);

  // Show nothing while checking auth
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-500 animate-pulse" />
          <span className="text-slate-500 text-xs font-mono tracking-widest uppercase">
            Verifying Access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-slate-100 flex flex-col overflow-hidden">
      {/* Map hover popup (rendered at app level) */}
      <EntityHoverPopup />

      {/* Header */}
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-mono font-bold tracking-wide text-slate-100">
            Integrated Sensor Fusion & Situational Awareness
          </h1>
          <div className="flex items-center gap-6">
            {activeMissionId && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveMission(null)}
                  className="text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  ← Missions
                </button>
                <WsStatusIndicator
                  eventsStatus={wsEventsStatus}
                  devicesStatus={wsDevicesStatus}
                  commandsStatus={wsCommandsStatus}
                />
              </>
            )}
            {/* Intercept stats */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">
                Neutralized:{" "}
                <span className="text-green-400">
                  {interceptStats.neutralized}
                </span>
              </span>
              <span className="text-slate-500">
                Engagements:{" "}
                <span className="text-amber-400">
                  {interceptStats.confirmed}
                </span>
              </span>
              <span className="text-slate-500">
                Success:{" "}
                <span className="text-cyan-400">
                  {interceptStats.successRate}%
                </span>
              </span>
            </div>
            {/* 2D / 3D map toggle */}
            <div className="flex rounded border border-slate-700 bg-slate-900/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setMapMode("2D")}
                className={`px-2.5 py-1 text-xs font-mono transition-colors ${
                  mapMode === "2D"
                    ? "bg-cyan-600 text-slate-100 border-cyan-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setMapMode("3D")}
                className={`px-2.5 py-1 text-xs font-mono transition-colors border-l border-slate-700 ${
                  mapMode === "3D"
                    ? "bg-cyan-600 text-slate-100 border-cyan-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                3D
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-400 text-xs font-mono">ONLINE</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-xs font-mono text-slate-500 hover:text-red-400 transition-colors px-2 py-1 border border-slate-700 hover:border-red-500/50 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {activeMissionId ? (
          <MissionWorkspace
            missionId={activeMissionId}
            assetsCollapsed={assetsCollapsed}
            trackingCollapsed={trackingCollapsed}
            mapMode={mapMode}
            onAssetsToggle={() => setAssetsCollapsed(!assetsCollapsed)}
            onTrackingToggle={() => setTrackingCollapsed(!trackingCollapsed)}
            onBackToMissions={() => setActiveMission(null)}
          />
        ) : (
          <>
            <MissionSelector />
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-mono">
              Select or create a mission to start
            </div>
          </>
        )}
      </div>
    </div>
  );
}
