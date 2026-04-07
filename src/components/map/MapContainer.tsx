"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { type ConfigSpecification, type MapOptions } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  setMap,
  setAlertTargets as setAlertTargetsInController,
  showHoverPopup,
  hideHoverPopup,
  selectEntity,
  clearSelection,
  updatePinnedPopupPosition,
  notifyOverlayPositionUpdate,
} from "./mapController";
import {
  registerMapActions,
  setComputedTargets,
  addPulseTarget,
  addIntercept as addInterceptToStore,
  subscribeToIntercepts,
  getNeutralizedTargetIds,
} from "@/stores/mapActionsStore";
import {
  addAssetLayers,
  setAssetLayersData,
  assetsToGeoJSON,
  stopAssetAnimation,
} from "./layers/assets";
import { addTargetLayers, updateTargetLayersData } from "./layers/targets";
import { addZonesLayer, setZonesLayerData } from "./layers/zones";
import { setBorderLayer } from "./layers/border";
import {
  mapFeaturesToAssetsGeoJSON,
  mapFeaturesToZonesGeoJSON,
  mapFeaturesToBorderGeoJSON,
  missionZonesToGeoJSON,
} from "@/utils/mapFeatures";
import { useTargetsStore } from "@/stores/targetsStore";
import { useMissionStore } from "@/stores/missionStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import type { Asset } from "@/types/assets";
import type { Target } from "@/types/targets";
import { destinationPoint } from "@/utils/geo";
import { fitMapToIndia, easeMapToIndia } from "@/utils/missionOverview";
import {
  getMapboxStyleUrl,
  getMapInitialConfig,
  getBasemapFragmentConfig,
  type BasemapVariant,
  type MapLightPreset,
} from "@/utils/mapboxBasemapConfig";

// Default fly-in center (Jammu region) — used only when no device data is available
const DEFAULT_FLY_CENTER: [number, number] = [75.1072, 32.5574];

/**
 * Compute the centroid of an array of [lng, lat] coordinates.
 * Returns null if the array is empty.
 */
function computeCentroid(coords: [number, number][]): [number, number] | null {
  if (coords.length === 0) return null;
  const sum = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

/**
 * Compute a tight bounding box for a set of coordinates.
 * Returns [sw, ne] as [[minLng, minLat], [maxLng, maxLat]], or null if empty.
 */
function computeBounds(
  coords: [number, number][],
): [[number, number], [number, number]] | null {
  if (coords.length === 0) return null;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

const EARTH_RADIUS_KM = 6371;

function calculateDistanceKm(a: [number, number], b: [number, number]): number {
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

function getNearestActiveAsset(
  target: Target,
  assets: Array<{
    id: string;
    name?: string;
    coordinates: [number, number];
    coverageRadiusKm: number;
    status: string;
  }>,
) {
  const activeAssets = assets.filter((a) => a.status === "ACTIVE");
  let minDist = Infinity;
  let closest: (typeof activeAssets)[0] | null = null;
  for (const asset of activeAssets) {
    const d = calculateDistanceKm(asset.coordinates, target.coordinates);
    if (d < minDist) {
      minDist = d;
      closest = asset;
    }
  }
  return closest;
}

export interface MapContainerProps {
  mapMode: "2D" | "3D";
  missionId?: string | null;
  mapFeatures?: GeoJSON.FeatureCollection | null;
  landingAssets?: Asset[];
  basemapVariant?: BasemapVariant;
  mapLightPreset?: MapLightPreset;
  /** Fired when the user clicks the map canvas but not on asset/target hit targets (e.g. dismiss shell overlays). */
  onMapBackgroundClick?: () => void;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function MapContainer({
  mapMode,
  missionId,
  mapFeatures,
  landingAssets = [],
  basemapVariant = "standard",
  mapLightPreset = "night",
  onMapBackgroundClick,
}: MapContainerProps) {
  const onMapBackgroundClickRef = useRef(onMapBackgroundClick);
  onMapBackgroundClickRef.current = onMapBackgroundClick;

  const missionIdRef = useRef(missionId);
  missionIdRef.current = missionId;
  const basemapVariantRef = useRef(basemapVariant);
  basemapVariantRef.current = basemapVariant;
  const mapLightPresetRef = useRef(mapLightPreset);
  mapLightPresetRef.current = mapLightPreset;
  const mapModeRef = useRef(mapMode);
  mapModeRef.current = mapMode;
  const mapFeaturesRef = useRef(mapFeatures);
  mapFeaturesRef.current = mapFeatures;
  const landingAssetsRef = useRef(landingAssets);
  landingAssetsRef.current = landingAssets;

  const appliedStyleUrlRef = useRef<string | null>(null);
  const appliedLightPresetRef = useRef<MapLightPreset | null>(null);
  const mapInteractionListenersAttachedRef = useRef(false);
  const mountOperationalLayersRef = useRef<(() => Promise<void>) | null>(null);

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
  const [neutralizedTargetIds, setNeutralizedTargetIds] = useState<string[]>(
    [],
  );

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

  const apiTargets = useTargetsStore((s) => s.targets);
  const cachedMission = useMissionStore((s) => s.cachedMission);
  const byDeviceId = useDeviceStatusStore((s) => s.byDeviceId);
  const useApiTargets = !!missionId;

  const assetsForIntercept = useMemo((): Asset[] => {
    if (!missionId) {
      return landingAssets;
    }

    const statusOverride = (deviceId: string, fallback: string) => {
      const ws = byDeviceId[deviceId];
      if (!ws) return fallback;
      return ws.status === "ONLINE" || ws.status === "WORKING"
        ? "ACTIVE"
        : "INACTIVE";
    };
    if (cachedMission?.devices?.length) {
      return cachedMission.devices.map((d) => {
        const raw = d.status ?? "OFFLINE";
        const s = statusOverride(
          d.id,
          raw === "ONLINE" || raw === "WORKING" ? "ACTIVE" : "INACTIVE",
        );
        return {
          id: d.id,
          name: d.name ?? d.serial_number ?? d.id,
          coordinates: [d.longitude, d.latitude] as [number, number],
          coverageRadiusKm: (d.detection_radius_m ?? 2000) / 1000,
          status: s as Asset["status"],
          altitude: 0,
          area: "",
        };
      });
    }
    // No mock fallback — return empty until API data loads
    return [];
  }, [missionId, landingAssets, cachedMission?.devices, byDeviceId]);

  const assetsForInterceptRef = useRef(assetsForIntercept);
  assetsForInterceptRef.current = assetsForIntercept;

  const computedTargets = useMemo(() => {
    if (useApiTargets) {
      return apiTargets.map((t) => ({
        ...t,
        ...targetOverrides[t.id],
      }));
    }
    // No mock fallback — return empty until API data loads
    return [] as (Target & { confirmed?: boolean })[];
  }, [useApiTargets, apiTargets, targetOverrides]);

  const targetsForMap = useMemo(
    () =>
      computedTargets.map((t) => ({
        ...t,
        neutralized: neutralizedTargetIds.includes(t.id),
      })),
    [computedTargets, neutralizedTargetIds],
  );

  const computedTargetsRef = useRef(computedTargets);
  computedTargetsRef.current = computedTargets;

  const interceptFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.LineString>[]>(
    [],
  );
  const interceptAnimationStartedRef = useRef(false);
  const interceptAnimationFrameRef = useRef<number | null>(null);
  const addInterceptRef = useRef<((target: Target) => void) | null>(null);
  const removeInterceptLineRef = useRef<((targetId: string) => void) | null>(
    null,
  );

  function reclassifyTarget(
    id: string,
    classification: Target["classification"],
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

  // Register map actions for popup controls (reclassify, confirm threat)
  useEffect(() => {
    registerMapActions({ reclassifyTarget, confirmThreat });
  }, []);

  // Sync computedTargets to store (for TrackingPanel)
  useEffect(() => {
    setComputedTargets(computedTargets);
  }, [computedTargets]);

  // Simulated drift: update target coordinates from heading/speed (mock only; API targets are live)
  const lastDriftRef = useRef<number>(Date.now());
  useEffect(() => {
    if (useApiTargets) return;
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
            distanceKm,
          );
          const newDistanceKm = calculateDistanceKm(
            DEFAULT_FLY_CENTER,
            newCoords,
          );
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
  }, [neutralizedTargetIds, useApiTargets]);

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

        const assets = assetsForInterceptRef.current;
        const activeAssets = assets.filter((a) => a.status === "ACTIVE");

        for (const asset of activeAssets) {
          if (isInsideCoverage(asset, target)) {
            confirmThreat(target.id);
            setAlertTargets((prev) =>
              prev.includes(target.id) ? prev : [...prev, target.id],
            );
            break;
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [computedTargets, targetOverrides]);

  useEffect(() => {
    const mountOperationalLayers = async () => {
      const map = mapRef.current;
      if (!map) return;

      stopAssetAnimation();

      if (interceptAnimationFrameRef.current != null) {
        cancelAnimationFrame(interceptAnimationFrameRef.current);
        interceptAnimationFrameRef.current = null;
      }
      interceptAnimationStartedRef.current = false;

      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();

      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      if (mapModeRef.current === "3D") {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.3 });
      } else {
        map.setTerrain(null);
      }

      const mf = mapFeaturesRef.current;
      const missionDevices = useMissionStore.getState().cachedMission?.devices;
      let assetsGeoJSON: GeoJSON.FeatureCollection | undefined;
      if (missionDevices?.length) {
        const statusStore = useDeviceStatusStore.getState().byDeviceId;
        const deviceAssets: Asset[] = missionDevices.map((d) => {
          const ws = statusStore[d.id];
          const isActive = ws
            ? ws.status === "ONLINE" || ws.status === "WORKING"
            : d.status === "ONLINE" || d.status === "WORKING";
          return {
            id: d.id,
            name: d.name ?? d.serial_number ?? d.id,
            coordinates: [d.longitude, d.latitude] as [number, number],
            coverageRadiusKm: (d.detection_radius_m ?? 2000) / 1000,
            status: (isActive ? "ACTIVE" : "INACTIVE") as Asset["status"],
            altitude: 0,
            area: "",
          };
        });
        assetsGeoJSON = assetsToGeoJSON(deviceAssets);
      } else if (mf) {
        assetsGeoJSON = mapFeaturesToAssetsGeoJSON(mf);
      }
      await addAssetLayers(map, assetsGeoJSON);

      const missionZones = useMissionStore.getState().cachedMission?.zones;
      if (missionZones?.length) {
        addZonesLayer(map, missionZonesToGeoJSON(missionZones));
      } else if (mf) {
        addZonesLayer(map, mapFeaturesToZonesGeoJSON(mf));
      }
      if (mf) {
        const border = mapFeaturesToBorderGeoJSON(mf);
        if (border) setBorderLayer(map, border);
      }
      await addTargetLayers(
        map,
        computedTargetsRef.current.map((t) => ({
          ...t,
          neutralized: getNeutralizedTargetIds().includes(t.id),
        })),
        useTargetsStore.getState().positionHistory,
      );

      map.addSource("intercepts", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [...interceptFeaturesRef.current],
        },
      });

      map.addLayer({
        id: "intercept-line",
        type: "line",
        source: "intercepts",
        slot: "top",
        paint: {
          "line-color": "#ff3333",
          "line-width": 3,
          "line-dasharray": [2, 2],
          "line-opacity": 0.95,
          "line-emissive-strength": 1,
          "line-color-use-theme": "disabled",
        },
      });

      addInterceptRef.current = (target: Target) => {
        const assets = assetsForInterceptRef.current;
        const asset =
          getNearestActiveAsset(target, assets) ?? assets[0] ?? null;
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
            (f) => (f.properties?.targetId as string) !== targetId,
          );
          const src = map.getSource("intercepts") as mapboxgl.GeoJSONSource;
          if (src) {
            src.setData({
              type: "FeatureCollection",
              features: [...interceptFeaturesRef.current],
            });
          }
        };

        if (!interceptAnimationStartedRef.current) {
          interceptAnimationStartedRef.current = true;
          let dashOffset = 0;

          function animateIntercept() {
            const m = mapRef.current;
            if (!m) return;
            dashOffset += 0.5;
            if (dashOffset > 4) dashOffset = 0;
            try {
              m.setPaintProperty("intercept-line", "line-dasharray", [
                2,
                2,
                dashOffset,
              ]);
            } catch {
              /* style reload */
            }
            interceptAnimationFrameRef.current =
              requestAnimationFrame(animateIntercept);
          }
          interceptAnimationFrameRef.current =
            requestAnimationFrame(animateIntercept);
        }
      };

      if (!mapInteractionListenersAttachedRef.current) {
        mapInteractionListenersAttachedRef.current = true;

        const getAssetById = (id: string): Asset | undefined => {
          return assetsForInterceptRef.current.find((x) => x.id === id);
        };
        map.on("mousemove", "assets-symbols", (e) => {
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features[0];
          const assetId = feature.properties?.id as string;
          const asset = getAssetById(assetId);
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
          const target = computedTargetsRef.current.find(
            (t) => t.id === targetId,
          );
          if (target) showHoverPopup("target", target, e.lngLat);
        });

        map.on("mouseleave", "targets-symbols", () => {
          map.getCanvas().style.cursor = "";
          hideHoverPopup();
        });

        const handleAssetClick = (
          e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] },
        ) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const asset = getAssetById(feature.properties?.id as string);
          if (asset) selectEntity("asset", asset, e.lngLat);
        };

        const handleTargetClick = (
          e: mapboxgl.MapMouseEvent & { features?: GeoJSON.Feature[] },
        ) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const target = computedTargetsRef.current.find(
            (t) => t.id === feature.properties?.id,
          );
          if (target) selectEntity("target", target, e.lngLat);
        };

        map.on("click", "assets-symbols", handleAssetClick);
        map.on("click", "assets-coverage", handleAssetClick);
        map.on("click", "targets-symbols", handleTargetClick);

        map.on("click", (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["assets-symbols", "assets-coverage", "targets-symbols"],
          });
          if (features.length > 0) return;
          clearSelection();
          onMapBackgroundClickRef.current?.();
        });

        map.on("move", () => {
          updatePinnedPopupPosition();
          notifyOverlayPositionUpdate();
        });
        map.on("zoom", () => {
          updatePinnedPopupPosition();
          notifyOverlayPositionUpdate();
        });
      }
    };

    mountOperationalLayersRef.current = mountOperationalLayers;

    const tryInitialize = () => {
      if (mapRef.current) return;
      if (!mapContainerRef.current) return;

      const container = mapContainerRef.current;
      const rect = container.getBoundingClientRect();

      if (
        (rect.width === 0 || rect.height === 0) &&
        initAttemptRef.current < 10
      ) {
        console.log(
          "Container not ready, waiting... attempt:",
          initAttemptRef.current,
        );
        initAttemptRef.current++;
        setTimeout(tryInitialize, 100);
        return;
      }

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      if (!token || token === "pk.YOUR_MAPBOX_TOKEN") {
        setError(
          "MAPBOX TOKEN REQUIRED — Update NEXT_PUBLIC_MAPBOX_TOKEN in .env.local",
        );
        return;
      }

      mapboxgl.accessToken = token;

      const initStyleUrl = getMapboxStyleUrl(basemapVariantRef.current);
      const initConfig = getMapInitialConfig(
        basemapVariantRef.current,
        mapLightPresetRef.current,
      );
      appliedStyleUrlRef.current = initStyleUrl;
      appliedLightPresetRef.current = mapLightPresetRef.current;

      const map = new mapboxgl.Map({
        container,
        style: initStyleUrl,
        config: initConfig as MapOptions["config"],
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

        map.setProjection("globe");

        // Disable interaction during intro
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        // 5️⃣ Cinematic fly-in — overview: India; mission: devices or default center
        const mid = missionIdRef.current;
        if (!mid) {
          const landingCoords = landingAssetsRef.current.map(
            (asset) => asset.coordinates,
          );
          const landingBounds = computeBounds(landingCoords);

          if (landingBounds && landingCoords.length > 0) {
            map.fitBounds(landingBounds, {
              padding: { top: 80, bottom: 140, left: 64, right: 64 },
              pitch: 55,
              bearing: -20,
              duration: 5000,
              essential: true,
              maxZoom: 11,
            });
          } else {
            fitMapToIndia(map);
          }
        } else {
          const missionData = useMissionStore.getState().cachedMission;
          const deviceCoords: [number, number][] = (
            missionData?.devices ?? []
          ).map((d) => [d.longitude, d.latitude] as [number, number]);
          const bounds = computeBounds(deviceCoords);
          const flyCenter = computeCentroid(deviceCoords) ?? DEFAULT_FLY_CENTER;

          if (bounds && deviceCoords.length >= 2) {
            map.fitBounds(bounds, {
              padding: { top: 80, bottom: 80, left: 320, right: 320 },
              pitch: 55,
              bearing: -20,
              duration: 5000,
              essential: true,
              maxZoom: 14,
            });
          } else {
            map.flyTo({
              center: flyCenter,
              zoom: deviceCoords.length > 0 ? 12 : 10,
              pitch: 55,
              bearing: -20,
              duration: 5000,
              essential: true,
            });
          }
        }

        map.once("moveend", async () => {
          console.log("Operational mode activated");
          await mountOperationalLayers();
          setIsIntroComplete(true);
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
        "bottom-right",
      );

      map.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 100 }),
        "bottom-left",
      );

      mapRef.current = map;
      setMap(map);
    };

    const timer = setTimeout(tryInitialize, 50);

    return () => {
      clearTimeout(timer);
      mapInteractionListenersAttachedRef.current = false;
      appliedStyleUrlRef.current = null;
      appliedLightPresetRef.current = null;
      setMap(null);
      setMapReady(false);
      setIsIntroComplete(false);
      addInterceptRef.current = null;
      // Cancel animation frames to prevent memory leaks
      stopAssetAnimation();
      if (interceptAnimationFrameRef.current !== null) {
        cancelAnimationFrame(interceptAnimationFrameRef.current);
        interceptAnimationFrameRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isIntroComplete) return;

    const url = getMapboxStyleUrl(basemapVariant);
    const basemapFrag = getBasemapFragmentConfig(
      basemapVariant,
      mapLightPreset,
    ) as ConfigSpecification;
    const fullConfig = { basemap: basemapFrag } as MapOptions["config"];

    const sameStyle = appliedStyleUrlRef.current === url;
    const sameLight = appliedLightPresetRef.current === mapLightPreset;
    if (sameStyle && sameLight) return;

    if (!sameStyle) {
      appliedStyleUrlRef.current = url;
      appliedLightPresetRef.current = mapLightPreset;
      if (interceptAnimationFrameRef.current != null) {
        cancelAnimationFrame(interceptAnimationFrameRef.current);
        interceptAnimationFrameRef.current = null;
      }
      interceptAnimationStartedRef.current = false;
      map.setStyle(url, { config: fullConfig } as Parameters<
        mapboxgl.Map["setStyle"]
      >[1]);
      map.once("style.load", () => {
        map.setProjection("globe");
        void mountOperationalLayersRef.current?.();
      });
    } else {
      appliedLightPresetRef.current = mapLightPreset;
      map.setConfig("basemap", basemapFrag);
    }
  }, [basemapVariant, mapLightPreset, isIntroComplete]);

  // Smooth interpolation: lerp display positions toward target positions (~20fps)
  const displayCoordsRef = useRef<Record<string, [number, number]>>({});
  const interpolationRafRef = useRef<number | null>(null);
  const LERP_FACTOR = 0.2;
  const frameCountRef = useRef(0);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;

    const tick = () => {
      frameCountRef.current++;
      if (frameCountRef.current % 3 !== 0) {
        interpolationRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const targets = computedTargetsRef.current.map((t) => ({
        ...t,
        neutralized: getNeutralizedTargetIds().includes(t.id),
      }));
      const posHist = useTargetsStore.getState().positionHistory;

      const interpolated = targets.map((t) => {
        const [lng, lat] = t.coordinates;
        let disp = displayCoordsRef.current[t.id];
        if (!disp) disp = [lng, lat];
        const newLng = disp[0] + (lng - disp[0]) * LERP_FACTOR;
        const newLat = disp[1] + (lat - disp[1]) * LERP_FACTOR;
        displayCoordsRef.current[t.id] = [newLng, newLat];
        return { ...t, coordinates: [newLng, newLat] as [number, number] };
      });

      const ids = new Set(targets.map((t) => t.id));
      for (const id of Object.keys(displayCoordsRef.current)) {
        if (!ids.has(id)) delete displayCoordsRef.current[id];
      }

      updateTargetLayersData(map, interpolated, posHist);
      interpolationRafRef.current = requestAnimationFrame(tick);
    };

    interpolationRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (interpolationRafRef.current != null) {
        cancelAnimationFrame(interpolationRafRef.current);
        interpolationRafRef.current = null;
      }
    };
  }, [mapReady, isIntroComplete]);

  // Update assets from device data (primary source for radar icons)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;
    if (assetsForIntercept.length > 0) {
      setAssetLayersData(map, assetsToGeoJSON(assetsForIntercept));
    }
  }, [assetsForIntercept, mapReady, isIntroComplete]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete || missionId) return;

    if (landingAssets.length > 0) {
      setAssetLayersData(map, assetsToGeoJSON(landingAssets));
      return;
    }

    setAssetLayersData(map, EMPTY_FC);
  }, [landingAssets, missionId, mapReady, isIntroComplete]);

  // Update zones, border when mapFeatures or cachedMission changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;
    // Only update assets from mapFeatures if we have no device data
    if (assetsForIntercept.length === 0 && mapFeatures) {
      setAssetLayersData(map, mapFeaturesToAssetsGeoJSON(mapFeatures));
    }
    // Prefer mission zones (has priority for TL-1/TL-2 coloring)
    const missionZones = cachedMission?.zones;
    if (missionZones?.length) {
      setZonesLayerData(map, missionZonesToGeoJSON(missionZones));
    } else if (mapFeatures) {
      setZonesLayerData(map, mapFeaturesToZonesGeoJSON(mapFeatures));
    }
    if (mapFeatures) {
      const border = mapFeaturesToBorderGeoJSON(mapFeatures);
      if (border) setBorderLayer(map, border);
    }
  }, [
    mapFeatures,
    cachedMission?.zones,
    mapReady,
    isIntroComplete,
    assetsForIntercept.length,
  ]);

  // Re-center map when device data loads after initial map render
  const hasFittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;
    if (hasFittedRef.current) return; // Only fit once
    if (assetsForIntercept.length === 0) return;

    const coords = assetsForIntercept.map((a) => a.coordinates);
    const bounds = computeBounds(coords);

    if (bounds && coords.length >= 2) {
      hasFittedRef.current = true;
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 320, right: 320 },
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        duration: 2000,
        maxZoom: 14,
      });
    } else if (coords.length === 1) {
      hasFittedRef.current = true;
      map.flyTo({
        center: coords[0],
        zoom: 12,
        duration: 2000,
      });
    }
  }, [assetsForIntercept, mapReady, isIntroComplete]);

  const prevMissionIdRef = useRef<string | null>(null);
  const hasFittedLandingAssetsRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;
    const prev = prevMissionIdRef.current;
    const cur = missionId ?? null;
    if (prev === cur) return;
    if (prev && !cur) {
      hasFittedRef.current = false;
      hasFittedLandingAssetsRef.current = false;
      const landingCoords = landingAssetsRef.current.map(
        (asset) => asset.coordinates,
      );
      const landingBounds = computeBounds(landingCoords);

      if (landingBounds && landingCoords.length > 0) {
        map.fitBounds(landingBounds, {
          padding: { top: 80, bottom: 140, left: 64, right: 64 },
          duration: 2000,
          maxZoom: 11,
        });
      } else {
        easeMapToIndia(map);
      }
    }
    if ((!prev && cur) || (prev && cur && prev !== cur)) {
      hasFittedRef.current = false;
      hasFittedLandingAssetsRef.current = false;
    }
    prevMissionIdRef.current = cur;
  }, [missionId, mapReady, isIntroComplete]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete || missionId) return;
    if (hasFittedLandingAssetsRef.current || landingAssets.length === 0) return;

    const landingCoords = landingAssets.map((asset) => asset.coordinates);
    const landingBounds = computeBounds(landingCoords);
    if (!landingBounds) return;

    hasFittedLandingAssetsRef.current = true;
    map.fitBounds(landingBounds, {
      padding: { top: 80, bottom: 140, left: 64, right: 64 },
      duration: 2000,
      maxZoom: 11,
    });
  }, [landingAssets, missionId, mapReady, isIntroComplete]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isIntroComplete) return;
    if (missionId) return;
    if (landingAssets.length > 0) {
      setAssetLayersData(map, assetsToGeoJSON(landingAssets));
    } else {
      setAssetLayersData(map, EMPTY_FC);
    }
    setZonesLayerData(map, EMPTY_FC);
    setBorderLayer(map, null);
  }, [missionId, landingAssets, mapReady, isIntroComplete]);

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
      className="driif-map-host absolute inset-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
