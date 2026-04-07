"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CopShell } from "@/components/cop-shell/CopShell";
import { CopTopBar } from "@/components/cop-shell/CopTopBar";
import { MissionSelector } from "@/components/missions/MissionSelector";
import { MissionWorkspace } from "@/components/missions/MissionWorkspace";
import {
  subscribeToIntercepts,
  getInterceptStats,
} from "@/stores/mapActionsStore";
import { useAuthStore } from "@/stores/authStore";
import { logout } from "@/lib/api/auth";
import { useMissionStore } from "@/stores/missionStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { useWsStatusStore } from "@/stores/wsStatusStore";
import { useLandingMissionAssets, useMapFeatures } from "@/hooks/useMissions";
import { COLOR, POSITION } from "@/styles/driifTokens";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: COLOR.pageBg }}
      >
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

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);
  const [trackingCollapsed, setTrackingCollapsed] = useState(false);
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");
  const [basemapVariant, setBasemapVariant] = useState<
    "standard" | "standard-satellite"
  >("standard");
  const [mapLightPreset, setMapLightPreset] = useState<"day" | "night">(
    "night",
  );
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [activeNavKey, setActiveNavKey] = useState<string | null>(null);
  const [mapDismissLocked, setMapDismissLocked] = useState(false);
  const [interceptStats, setInterceptStats] = useState({
    neutralized: 0,
    confirmed: 0,
    successRate: 0,
  });

  const token = useAuthStore((s) => s.getToken());
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const setActiveMission = useMissionStore((s) => s.setActiveMission);
  const setCachedMission = useMissionStore((s) => s.setCachedMission);
  const clearTargets = useTargetsStore((s) => s.clearTargets);

  const wsEventsStatus = useWsStatusStore((s) => s.eventsStatus);
  const wsDevicesStatus = useWsStatusStore((s) => s.devicesStatus);
  const wsCommandsStatus = useWsStatusStore((s) => s.commandsStatus);

  const { data: mapFeatures } = useMapFeatures(
    activeMissionId,
    !!activeMissionId,
  );
  const { data: landingMissionAssets } = useLandingMissionAssets(!activeMissionId);

  useEffect(() => {
    return subscribeToIntercepts(() => {
      setInterceptStats(getInterceptStats());
    });
  }, []);

  useEffect(() => {
    if (!token) {
      clearAuth();
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router, token, clearAuth]);

  const exitMission = useCallback(() => {
    setActiveMission(null);
    setCachedMission(null);
    clearTargets();
  }, [setActiveMission, setCachedMission, clearTargets]);

  const onShellNav = useCallback((key: string) => {
    if (key === "missions") {
      setMissionsOpen(true);
      setActiveNavKey("missions");
      return;
    }
    setMissionsOpen(false);
    setActiveNavKey(key);
  }, []);

  const onShellClose = useCallback(() => {
    if (activeMissionId) {
      exitMission();
      return;
    }
    setMissionsOpen(false);
    setActiveNavKey(null);
  }, [activeMissionId, exitMission]);

  /** Dismiss left-nav overlays when the user clicks empty map (not asset/target glyphs). */
  const onMapBackgroundClick = useCallback(() => {
    if (mapDismissLocked) return;
    setMissionsOpen(false);
    setActiveNavKey(null);
  }, [mapDismissLocked]);

  if (!isAuthorized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLOR.pageBg }}
      >
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
    <div
      id="cop-dashboard"
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: COLOR.pageBg }}
    >
      <style>{`
        #cop-dashboard .mapboxgl-ctrl-top-right {
          top: auto !important;
          bottom: 100px !important;
          right: 16px !important;
        }
        #cop-dashboard .mapboxgl-ctrl-bottom-left {
          left: 16px !important;
          bottom: 16px !important;
        }
      `}</style>

      <div className="absolute inset-0 z-0">
        <MapContainer
          mapMode={mapMode}
          missionId={activeMissionId}
          mapFeatures={mapFeatures ?? undefined}
          landingAssets={landingMissionAssets}
          basemapVariant={basemapVariant}
          mapLightPreset={mapLightPreset}
          onMapBackgroundClick={onMapBackgroundClick}
        />
      </div>

      <EntityHoverPopup />

      <CopTopBar
        interceptStats={interceptStats}
        mapMode={mapMode}
        onMapMode={setMapMode}
        basemapVariant={basemapVariant}
        onBasemapVariant={setBasemapVariant}
        mapLightPreset={mapLightPreset}
        onMapLightPreset={setMapLightPreset}
        showWs={!!activeMissionId}
        ws={{
          eventsStatus: wsEventsStatus,
          devicesStatus: wsDevicesStatus,
          commandsStatus: wsCommandsStatus,
        }}
        onLogout={logout}
      />

      <CopShell
        activeNavKey={missionsOpen ? "missions" : activeNavKey}
        onNav={onShellNav}
        hasMission={!!activeMissionId}
        onBell={onShellClose}
      />

      {missionsOpen && (
        <div
          className="pointer-events-auto absolute z-[12]"
          style={{ left: POSITION.missionsLeft, top: POSITION.missionsTop }}
        >
          <MissionSelector
            variant="overlay"
            activeMissionId={activeMissionId}
            onMapDismissLockChange={setMapDismissLocked}
            onClose={() => {
              setMissionsOpen(false);
              setActiveNavKey(null);
              setMapDismissLocked(false);
            }}
          />
        </div>
      )}

      {activeMissionId && (
        <div className="absolute inset-0 z-[8] flex min-h-0 min-w-0 pointer-events-none">
          <MissionWorkspace
            missionId={activeMissionId}
            assetsCollapsed={assetsCollapsed}
            trackingCollapsed={trackingCollapsed}
            onAssetsToggle={() => setAssetsCollapsed((c) => !c)}
            onTrackingToggle={() => setTrackingCollapsed((c) => !c)}
          />
        </div>
      )}
    </div>
  );
}
