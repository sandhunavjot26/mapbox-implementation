"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { CopShell } from "@/components/cop-shell/CopShell";
import { OverallDetectionPanel } from "@/components/detections/OverallDetectionPanel";
import { CopTopBar } from "@/components/cop-shell/CopTopBar";
import { MissionSelector } from "@/components/missions/MissionSelector";
import { MissionWorkspace } from "@/components/missions/MissionWorkspace";
import { MissionEventToasts } from "@/components/alerts/MissionEventToasts";
import { DevicesInventoryOverlay } from "@/components/devices/DevicesInventoryOverlay";
import { useAuthStore } from "@/stores/authStore";
import { logout } from "@/lib/api/auth";
import { useMissionStore } from "@/stores/missionStore";
import { useMissionEventsStore } from "@/stores/missionEventsStore";
import { useTargetsStore } from "@/stores/targetsStore";
import { useLandingMissionAssets, useLandingBorders, useMapFeatures } from "@/hooks/useMissions";
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
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");
  const [basemapVariant, setBasemapVariant] = useState<
    "standard" | "standard-satellite"
  >("standard");
  const [mapLightPreset, setMapLightPreset] = useState<"day" | "night">(
    "day",
  );
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [detectionsOpen, setDetectionsOpen] = useState(false);
  const [mapDismissLocked, setMapDismissLocked] = useState(false);
  const token = useAuthStore((s) => s.getToken());
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const activeMissionId = useMissionStore((s) => s.activeMissionId);
  const setActiveMission = useMissionStore((s) => s.setActiveMission);
  const setCachedMission = useMissionStore((s) => s.setCachedMission);
  const clearTargets = useTargetsStore((s) => s.clearTargets);
  const clearMissionEvents = useMissionEventsStore((s) => s.clearEvents);

  const { data: mapFeatures } = useMapFeatures(
    activeMissionId,
    !!activeMissionId,
  );
  const { data: landingMissionAssets } = useLandingMissionAssets();
  const landingBorders = useLandingBorders();

  /** Deep link from `/dashboard?setMission=<uuid>` (e.g. devices → open on map). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const mid = u.searchParams.get("setMission");
    if (!mid) return;
    setActiveMission(mid);
    setCachedMission(null);
    u.searchParams.delete("setMission");
    window.history.replaceState(null, "", u.toString());
  }, [setActiveMission, setCachedMission]);

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
    if (key === "assets") {
      setDevicesOpen(true);
      setMissionsOpen(false);
      return;
    }
    if (key === "missions") {
      setMissionsOpen(true);
      setDevicesOpen(false);
      return;
    }
    setMissionsOpen(false);
    setDevicesOpen(false);
  }, []);

  const onShellClose = useCallback(() => {
    if (activeMissionId) {
      exitMission();
      setDetectionsOpen(false);
      return;
    }
    setMissionsOpen(false);
    setDevicesOpen(false);
    setDetectionsOpen(false);
  }, [activeMissionId, exitMission]);

  /** Dismiss left-nav overlays when the user clicks empty map (not asset/target glyphs). */
  const onMapBackgroundClick = useCallback(() => {
    if (mapDismissLocked) return;
    setMissionsOpen(false);
    setDevicesOpen(false);
    setDetectionsOpen(false);
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
          landingBorders={landingBorders}
          basemapVariant={basemapVariant}
          mapLightPreset={mapLightPreset}
          onMapBackgroundClick={onMapBackgroundClick}
        />
      </div>

      <EntityHoverPopup />

      <CopTopBar
        mapMode={mapMode}
        onMapMode={setMapMode}
        basemapVariant={basemapVariant}
        onBasemapVariant={setBasemapVariant}
        mapLightPreset={mapLightPreset}
        onMapLightPreset={setMapLightPreset}
        onLogout={logout}
      />

      <CopShell
        activeNavKey={
          missionsOpen ? "missions" : devicesOpen ? "assets" : null
        }
        onNav={onShellNav}
        hasMission={!!activeMissionId}
        onBell={onShellClose}
        onDetection={() => setDetectionsOpen((v) => !v)}
        detectionsOpen={detectionsOpen}
      />

      {detectionsOpen && (
        <div
          className="pointer-events-auto absolute z-[12]"
          style={{
            right: POSITION.bellRight,
            top: `calc(${POSITION.bellTop} + ${POSITION.bellSize} + 8px)`,
          }}
        >
          <OverallDetectionPanel variant="overlay" />
        </div>
      )}

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
              setMapDismissLocked(false);
            }}
          />
        </div>
      )}

      {devicesOpen && (
        <div
          className="pointer-events-auto absolute z-[12]"
          style={{ left: POSITION.missionsLeft, top: POSITION.missionsTop }}
        >
          <DevicesInventoryOverlay
            onFocusMissionOnMap={(missionId) => {
              if (missionId) {
                clearTargets();
                setActiveMission(missionId);
                setCachedMission(null);
              }
              setDevicesOpen(false);
            }}
            onMapDismissLockChange={setMapDismissLocked}
          />
        </div>
      )}

      {activeMissionId && (
        <>
          <MissionEventToasts />
          <div
            className="pointer-events-auto absolute z-[11] flex min-h-0 min-w-0 flex-col"
            style={{
              right: POSITION.bellRight,
              top: `calc(${POSITION.bellTop} + ${POSITION.bellSize} + 8px)`,
              bottom: POSITION.zoomBottom,
              width: "min(510px, calc(100vw - 32px))",
            }}
          >
            <MissionWorkspace
              missionId={activeMissionId}
              onDeselect={exitMission}
            />
          </div>
        </>
      )}

      <footer
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[13]"
        aria-label="Product attribution"
      >
        <div className="flex justify-center bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10">
          <div className="flex items-center justify-center gap-1.5 text-center text-[11px] font-mono tracking-wide text-slate">
            <span>VectorWings · Precision in motion | Powered by DRIIF</span>
            <Image
              src="/driif-logo-small.png"
              alt=""
              width={48}
              height={18}
              className="h-4 w-auto shrink-0"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
