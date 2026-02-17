"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  setMap,
  setAlertTargets as setAlertTargetsInController,
  showHoverPopup,
  hideHoverPopup,
  selectEntity,
  clearSelection,
  updatePinnedPopupPosition,
} from "./mapController";
import {
  registerMapActions,
  setComputedTargets,
  addPulseTarget,
  addIntercept as addInterceptToStore,
  subscribeToIntercepts,
  getNeutralizedTargetIds,
} from "@/stores/mapActionsStore";
import { addAssetLayers } from "./layers/assets";
import { addTargetLayers, updateTargetLayersData } from "./layers/targets";
import { MOCK_ASSETS } from "@/mock/assets";
import type { Asset } from "@/mock/assets";
import { MOCK_TARGETS } from "@/mock/targets";
import type { Target } from "@/mock/targets";
import { destinationPoint } from "@/utils/geo";

// Fly-in destination (Jammu region)
const FLY_TO_CENTER: [number, number] = [75.1072, 32.5574];

const EARTH_RADIUS_KM = 6371;

function calculateDistanceKm(
  a: [number, number],
  b: [number, number]
): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isInsideCoverage(asset: Asset, target: Target) {
  return (
    calculateDistanceKm(asset.coordinates, target.coordinates) <=
    asset.coverageRadiusKm
  );
}

function getNearestActiveAsset(target: Target) {
  const activeAssets = MOCK_ASSETS.filter((a) => a.status === "ACTIVE");
  let minDist = Infinity;
  let closest: (typeof MOCK_ASSETS)[0] | null = null;
  for (const asset of activeAssets) {
    const d = calculateDistanceKm(asset.coordinates, target.coordinates);
    if (d < minDist) {
      minDist = d;
      closest = asset;
    }
  }
  return closest;
}

const FOG_CONFIG = {
  color: "rgb(10,10,15)",
  "high-color": "rgb(36,92,223)",
  "horizon-blend": 0.02,
  "space-color": "rgb(5,5,10)",
  "star-intensity": 0.6,
} as const;

export interface MapContainerProps {
  mapMode: "2D" | "3D";
}

export function MapContainer({ mapMode }: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initAttemptRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [targetOverrides, setTargetOverrides] = useState<
    Record<string, Partial<Target> & { confirmed?: boolean }>
  >({});
  const [alertTargets, setAlertTargets] = useState<string[]>([]);
  const [neutralizedTargetIds, setNeutralizedTargetIds] = useState<string[]>([]);

  useEffect(() => {
    return subscribeToIntercepts((interceptsList) => {
      setNeutralizedTargetIds(getNeutralizedTargetIds());
      // Remove intercept lines when neutralized
      const neutralized = interceptsList
        .filter((i) => i.state === "neutralized")
        .map((i) => i.targetId);
      neutralized.forEach((id) => removeInterceptLineRef.current?.(id));
    });
  }, []);

  const computedTargets = useMemo(() => {
    return MOCK_TARGETS.map((t) => ({
      ...t,
      ...targetOverrides[t.id],
    }));
  }, [targetOverrides]);

  const targetsForMap = useMemo(
    () =>
      computedTargets.map((t) => ({
        ...t,
        neutralized: neutralizedTargetIds.includes(t.id),
      })),
    [computedTargets, neutralizedTargetIds]
  );

  const computedTargetsRef = useRef(computedTargets);
  computedTargetsRef.current = computedTargets;

  const interceptFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.LineString>[]>([]);
  const interceptAnimationStartedRef = useRef(false);
  const addInterceptRef = useRef<((target: Target) => void) | null>(null);
  const removeInterceptLineRef = useRef<((targetId: string) => void) | null>(null);

  function reclassifyTarget(
    id: string,
    classification: Target["classification"]
  ) {
    setTargetOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], classification },
    }));
    addPulseTarget(id);
  }

  function confirmThreat(id: string) {
    const target = computedTargetsRef.current.find((t) => t.id === id);
    if (target && addInterceptRef.current) {
      addInterceptRef.current(target);
    }
    setTargetOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], confirmed: true },
    }));
  }

  // Register handlers for CommandConsole
  useEffect(() => {
    registerMapActions({ reclassifyTarget, confirmThreat });
  }, []);

  // Sync computedTargets to store (for TrackingPanel)
  useEffect(() => {
    setComputedTargets(computedTargets);
  }, [computedTargets]);

  // Simulated drift: update target coordinates from heading/speed
  const lastDriftRef = useRef<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaHours = (now - lastDriftRef.current) / 3600000;
      lastDriftRef.current = now;

      setTargetOverrides((prev) => {
        const next = { ...prev };
        let changed = false;
        computedTargetsRef.current.forEach((target) => {
          if (neutralizedTargetIds.includes(target.id)) return;
          const speed = target.speedKmH ?? 35;
          const distanceKm = speed * deltaHours;
          if (distanceKm < 0.0001) return;
          const newCoords = destinationPoint(
            target.coordinates,
            target.heading,
            distanceKm
          );
          const newDistanceKm = calculateDistanceKm(FLY_TO_CENTER, newCoords);
          next[target.id] = {
            ...next[target.id],
            coordinates: newCoords,
            distanceKm: newDistanceKm,
          };
          changed = true;
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [neutralizedTargetIds]);

  // Sync alertTargets to map controller (for TrackingPanel)
  useEffect(() => {
    setAlertTargetsInController(alertTargets);
  }, [alertTargets]);

  // Automatic coverage detection: auto-confirm ENEMY targets inside active asset coverage
  useEffect(() => {
    const interval = setInterval(() => {
      computedTargets.forEach((target) => {
        if (target.classification !== "ENEMY") return;
        if (targetOverrides[target.id]?.confirmed) return;

        const activeAssets = MOCK_ASSETS.filter((a) => a.status === "ACTIVE");

        for (const asset of activeAssets) {
          if (isInsideCoverage(asset, target)) {
            confirmThreat(target.id);
            setAlertTargets((prev) =>
              prev.includes(target.id) ? prev : [...prev, target.id]
            );
            break;
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [computedTargets, targetOverrides]);

  useEffect(() => {
    const tryInitialize = () => {
      if (mapRef.current) return;
      if (!mapContainerRef.current) return;

      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();

      if ((rect.width === 0 || rect.height === 0) && initAttemptRef.current < 10) {
        console.log("Container not ready, waiting... attempt:", initAttemptRef.current);
        initAttemptRef.current++;
        setTimeout(tryInitialize, 100);
        return;
      }

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      if (!token || token === "pk.YOUR_MAPBOX_TOKEN") {
        setError("MAPBOX TOKEN REQUIRED — Update NEXT_PUBLIC_MAPBOX_TOKEN in .env.local");
        return;
      }

      mapboxgl.accessToken = token;

      // 1️⃣ Map initialization — global view, satellite streets, zoom 2, no pitch
      const map = new mapboxgl.Map({
        container: container,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [0, 20],
        zoom: 2,
        pitch: 0,
        bearing: 0,
        antialias: true,
      });

      map.on("style.load", () => {
        console.log("Style loaded");
      });

      map.on("load", () => {
        console.log("Mapbox map loaded successfully");
        map.resize();
        setMapReady(true);

        // 2️⃣ Globe projection
        map.setProjection("globe");

        // 3️⃣ Atmospheric fog
        map.setFog(FOG_CONFIG);

        // 4️⃣ Disable interaction during intro
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        // 5️⃣ Cinematic fly-in to Jammu
        map.flyTo({
          center: FLY_TO_CENTER,
          zoom: 10,
          pitch: 55,
          bearing: -20,
          duration: 5000,
          essential: true,
        });

        // 6️⃣ After fly-in ends → terrain, 3D buildings, layers, enable interaction
        map.once("moveend", async () => {
          console.log("Operational mode activated");
          setIsIntroComplete(true);

          // Enable user interaction
          map.dragRotate.enable();
          map.touchZoomRotate.enableRotation();

          // Enable terrain
          map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: "mapbox-dem", exaggeration: 1.3 });

          // Add 3D buildings layer
          if (!map.getLayer("3d-buildings")) {
            map.addLayer({
              id: "3d-buildings",
              source: "composite",
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type: "fill-extrusion",
              minzoom: 14,
              paint: {
                "fill-extrusion-color": "#222",
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.6,
              },
            });
          }

          // 7️⃣ Dim satellite base for tactical clarity
          const layers = map.getStyle().layers;

          layers?.forEach((layer) => {
            if (layer.type === "raster") {
              map.setPaintProperty(layer.id, "raster-brightness-max", 0.75);
              map.setPaintProperty(layer.id, "raster-saturation", -0.45);
              map.setPaintProperty(layer.id, "raster-contrast", -0.2);
            }

            // Slightly reduce label intensity
            if (layer.type === "symbol" && layer.layout?.["text-field"]) {
              try {
                map.setPaintProperty(layer.id, "text-opacity", 0.85);
              } catch { }
            }
          });

          await addAssetLayers(map);
          await addTargetLayers(
            map,
            computedTargetsRef.current.map((t) => ({
              ...t,
              neutralized: getNeutralizedTargetIds().includes(t.id),
            }))
          );

          // Intercept source and layer
          map.addSource("intercepts", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          });

          map.addLayer({
            id: "intercept-line",
            type: "line",
            source: "intercepts",
            paint: {
              "line-color": "#ff0000",
              "line-width": 3,
              "line-dasharray": [2, 2],
            },
          });

          addInterceptRef.current = (target: Target) => {
            const asset = getNearestActiveAsset(target);
            if (!asset) return;

            addInterceptToStore(target.id, asset.id);

            const source = map.getSource("intercepts") as mapboxgl.GeoJSONSource;
            if (!source) return;

            const newFeature: GeoJSON.Feature<GeoJSON.LineString> = {
              type: "Feature",
              properties: { targetId: target.id },
              geometry: {
                type: "LineString",
                coordinates: [asset.coordinates, target.coordinates],
              },
            };

            interceptFeaturesRef.current.push(newFeature);
            source.setData({
              type: "FeatureCollection",
              features: [...interceptFeaturesRef.current],
            });

            removeInterceptLineRef.current = (targetId: string) => {
              interceptFeaturesRef.current = interceptFeaturesRef.current.filter(
                (f) => (f.properties?.targetId as string) !== targetId
              );
              const source = map.getSource("intercepts") as mapboxgl.GeoJSONSource;
              if (source) {
                source.setData({
                  type: "FeatureCollection",
                  features: [...interceptFeaturesRef.current],
                });
              }
            };

            if (!interceptAnimationStartedRef.current) {
              interceptAnimationStartedRef.current = true;
              let dashOffset = 0;

              function animateIntercept() {
                dashOffset += 0.5;
                if (dashOffset > 4) dashOffset = 0;
                try {
                  map.setPaintProperty("intercept-line", "line-dasharray", [
                    2,
                    2,
                    dashOffset,
                  ]);
                } catch {
                  // Layer may be removed
                }
                requestAnimationFrame(animateIntercept);
              }
              animateIntercept();
            }
          };

          // Hover and click listeners (layers exist only after this point)
          map.on("mousemove", "assets-symbols", (e) => {
            if (!e.features || e.features.length === 0) return;
            map.getCanvas().style.cursor = "pointer";
            const feature = e.features[0];
            const assetId = feature.properties?.id;
            const asset = MOCK_ASSETS.find((a) => a.id === assetId);
            if (asset) showHoverPopup("asset", asset, e.lngLat);
          });

          map.on("mouseleave", "assets-symbols", () => {
            map.getCanvas().style.cursor = "";
            hideHoverPopup();
          });

          map.on("mousemove", "targets-symbols", (e) => {
            if (!e.features || e.features.length === 0) return;
            map.getCanvas().style.cursor = "pointer";
            const feature = e.features[0];
            const targetId = feature.properties?.id;
            const target = computedTargetsRef.current.find((t) => t.id === targetId);
            if (target) showHoverPopup("target", target, e.lngLat);
          });

          map.on("mouseleave", "targets-symbols", () => {
            map.getCanvas().style.cursor = "";
            hideHoverPopup();
          });

          const handleAssetClick = (e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const asset = MOCK_ASSETS.find((a) => a.id === feature.properties?.id);
            if (asset) selectEntity("asset", asset, e.lngLat);
          };

          const handleTargetClick = (e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
            if (!e.features || e.features.length === 0) return;
            const feature = e.features[0];
            const target = computedTargetsRef.current.find((t) => t.id === feature.properties?.id);
            if (target) selectEntity("target", target, e.lngLat);
          };

          map.on("click", "assets-symbols", handleAssetClick);
          map.on("click", "assets-coverage", handleAssetClick);
          map.on("click", "targets-symbols", handleTargetClick);
          map.on("click", "targets-center", handleTargetClick);

          map.on("click", (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: [
                "assets-symbols",
                "assets-coverage",
                "targets-symbols",
                "targets-center",
              ],
            });
            if (features.length > 0) return;
            clearSelection();
          });

          map.on("move", updatePinnedPopupPosition);
          map.on("zoom", updatePinnedPopupPosition);
        });
      });

      map.once("render", () => {
        console.log("Map first render complete");
      });

      map.on("error", (e) => {
        const err = e as { error?: Error };
        const message = err.error?.message;
        if (message) {
          console.warn("Mapbox:", message);
          if (
            message.toLowerCase().includes("style") ||
            message.toLowerCase().includes("token")
          ) {
            setError("MAP LOAD ERROR — Check console for details");
          }
        }
        // Ignore empty/minimal errors (e.g. tile load, styleimagemissing)
      });

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: true }),
        "top-right"
      );

      map.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 100 }),
        "bottom-left"
      );

      mapRef.current = map;
      setMap(map);
    };

    const timer = setTimeout(tryInitialize, 50);

    return () => {
      clearTimeout(timer);
      setMap(null);
      setMapReady(false);
      setIsIntroComplete(false);
      addInterceptRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update target layer data when computedTargets or neutralized state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;
    updateTargetLayersData(map, targetsForMap);
  }, [targetsForMap, mapReady, isIntroComplete]);

  // 2D / 3D toggle (only after intro completes; terrain added in moveend)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;

    if (mapMode === "3D") {
      if (map.getSource("mapbox-dem")) {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.3 });
        map.easeTo({ pitch: 55, bearing: -20, duration: 800 });
      }
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [mapMode, mapReady, isIntroComplete]);

  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
