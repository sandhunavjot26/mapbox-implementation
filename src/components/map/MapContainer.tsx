"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  setMap,
  showHoverPopup,
  hideHoverPopup,
  selectEntity,
  clearSelection,
  updatePinnedPopupPosition,
} from "./mapController";
import { addAssetLayers } from "./layers/assets";
import { addTargetLayers } from "./layers/targets";
import { MOCK_ASSETS } from "@/mock/assets";
import { MOCK_TARGETS } from "@/mock/targets";

// Initial map center (Jammu region)
const INITIAL_CENTER: [number, number] = [75.1072, 32.5574];
const INITIAL_ZOOM = 10;

const DEM_SOURCE_ID = "mapbox-dem";

export interface MapContainerProps {
  mapMode: "2D" | "3D";
}

export function MapContainer({ mapMode }: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initAttemptRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const tryInitialize = () => {
      // Prevent re-initialization
      if (mapRef.current) return;
      if (!mapContainerRef.current) return;

      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();

      // Wait for container to have dimensions (max 10 attempts)
      if ((rect.width === 0 || rect.height === 0) && initAttemptRef.current < 10) {
        console.log("Container not ready, waiting... attempt:", initAttemptRef.current);
        initAttemptRef.current++;
        setTimeout(tryInitialize, 100);
        return;
      }

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      // Check for valid token
      if (!token || token === "pk.YOUR_MAPBOX_TOKEN") {
        setError("MAPBOX TOKEN REQUIRED — Update NEXT_PUBLIC_MAPBOX_TOKEN in .env.local");
        return;
      }

      // Set access token
      mapboxgl.accessToken = token;

      // Initialize map
      const map = new mapboxgl.Map({
        container: container,
        style: "mapbox://styles/mapbox/dark-v11",
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        attributionControl: false,
      });

      map.on("style.load", () => {
        console.log("Style loaded");
      });

      map.on("load", () => {
        console.log("Mapbox map loaded successfully");
        map.resize();
        setMapReady(true);

        // Add map layers
        addAssetLayers(map);
        addTargetLayers(map);

        // ============================================================
        // Hover event listeners for popups
        // ============================================================

        // Assets hover
        map.on("mousemove", "assets-points", (e) => {
          if (!e.features || e.features.length === 0) return;

          map.getCanvas().style.cursor = "pointer";

          const feature = e.features[0];
          const assetId = feature.properties?.id;

          // Find the full asset data
          const asset = MOCK_ASSETS.find((a) => a.id === assetId);
          if (asset) {
            showHoverPopup("asset", asset, e.lngLat);
          }
        });

        map.on("mouseleave", "assets-points", () => {
          map.getCanvas().style.cursor = "";
          hideHoverPopup();
        });

        // Targets hover
        map.on("mousemove", "targets-points", (e) => {
          if (!e.features || e.features.length === 0) return;

          map.getCanvas().style.cursor = "pointer";

          const feature = e.features[0];
          const targetId = feature.properties?.id;

          // Find the full target data
          const target = MOCK_TARGETS.find((t) => t.id === targetId);
          if (target) {
            showHoverPopup("target", target, e.lngLat);
          }
        });

        map.on("mouseleave", "targets-points", () => {
          map.getCanvas().style.cursor = "";
          hideHoverPopup();
        });

        // Helper: pin asset popup (used for both point and coverage layers)
        const handleAssetClick = (e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const asset = MOCK_ASSETS.find((a) => a.id === feature.properties?.id);
          if (asset) selectEntity("asset", asset, e.lngLat);
        };

        // Helper: pin target popup (used for glow, point, and center layers)
        const handleTargetClick = (e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const target = MOCK_TARGETS.find((t) => t.id === feature.properties?.id);
          if (target) selectEntity("target", target, e.lngLat);
        };

        // Click on asset (point or coverage circle) → pin popup
        map.on("click", "assets-points", handleAssetClick);
        map.on("click", "assets-coverage", handleAssetClick);

        // Click on target (glow, point, or center) → pin popup
        map.on("click", "targets-points", handleTargetClick);
        map.on("click", "targets-glow", handleTargetClick);
        map.on("click", "targets-center", handleTargetClick);

        // Click on empty map → clear pinned popup and selection
        // Use queryRenderedFeatures so we only clear when click is not on asset/target
        // (layer click and map click both fire; map click often has no e.features)
        map.on("click", (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: [
              "assets-points",
              "assets-coverage",
              "targets-points",
              "targets-glow",
              "targets-center",
            ],
          });
          if (features.length > 0) return;
          clearSelection();
        });

        // Update pinned popup position when map moves or zooms
        map.on("move", updatePinnedPopupPosition);
        map.on("zoom", updatePinnedPopupPosition);
      });

      map.once("render", () => {
        console.log("Map first render complete");
      });

      map.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("MAP LOAD ERROR — Check console for details");
      });

      // Add navigation controls
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: true }),
        "top-right"
      );

      // Add scale control
      map.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 100 }),
        "bottom-left"
      );

      mapRef.current = map;

      // Register map with controller
      setMap(map);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(tryInitialize, 50);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      setMap(null);
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2D / 3D terrain and camera (no map reinit)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (mapMode === "3D") {
      // Add DEM source once if not already present
      if (!map.getSource(DEM_SOURCE_ID)) {
        map.addSource(DEM_SOURCE_ID, {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        });
      }
      map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.3 });
      map.easeTo({ pitch: 60, bearing: -20, duration: 800 });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [mapMode, mapReady]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show error state
  if (error) {
    return (
      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 border border-red-500/50 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-red-500 animate-pulse" />
          </div>
          <p className="text-red-400 font-mono text-xs tracking-wide mb-2">
            {error}
          </p>
          <p className="text-slate-500 font-mono text-[10px]">
            Get a token at mapbox.com/account/access-tokens
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
