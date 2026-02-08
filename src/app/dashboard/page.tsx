"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { StatusBadge } from "@/components/status/StatusBadge";
import { AssetsPanel } from "@/components/panels/AssetsPanel";
import { TrackingPanel } from "@/components/panels/TrackingPanel";

import { MOCK_ASSETS } from "@/mock/assets";
import { MOCK_TARGETS } from "@/mock/targets";

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
  }
);

// Dynamic import for hover popup (needs access to mapController)
const EntityHoverPopup = dynamic(
  () =>
    import("@/components/map/overlays/EntityHoverPopup").then(
      (mod) => mod.EntityHoverPopup
    ),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);
  const [trackingCollapsed, setTrackingCollapsed] = useState(false);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (isAuthenticated !== "true") {
      router.push("/login");
    } else {
      setTimeout(() => {
        setIsAuthorized(true);
      }, 100);
    }
  }, [router]);

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
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-slate-400 text-xs font-mono">ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Assets */}
        <AssetsPanel
          assets={MOCK_ASSETS}
          collapsed={assetsCollapsed}
          onToggle={() => setAssetsCollapsed(!assetsCollapsed)}
        />

        {/* Center - Map Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer />
          </div>

          {/* Bottom status bar */}
          <div className="shrink-0 border-t border-slate-800 bg-slate-950/50 px-4 py-2">
            <div className="flex items-center justify-center gap-8">
              <StatusBadge color="red" label="REAL-TIME DATA AGGREGATION" />
              <StatusBadge color="amber" label="COMMON OPERATIONAL PICTURE (COP)" />
              <StatusBadge color="green" label="THREAT PROFILING" />
              <StatusBadge color="cyan" label="COUNTER-UAS EFFECTORS" />
            </div>
          </div>
        </main>

        {/* Right Panel - Tracking */}
        <TrackingPanel
          targets={MOCK_TARGETS}
          collapsed={trackingCollapsed}
          onToggle={() => setTrackingCollapsed(!trackingCollapsed)}
        />
      </div>
    </div>
  );
}
