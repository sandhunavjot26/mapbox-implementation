"use client";

import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { getMap } from "@/components/map/mapController";
import { CreateFencePanel } from "@/components/missions/CreateFencePanel";
import {
  FenceDrawToolbar,
  type FenceDrawMode,
} from "@/components/missions/FenceDrawToolbar";
import { FenceMetadataPopover } from "@/components/missions/FenceMetadataPopover";

type Coordinate = [number, number];

type SavedFence = {
  name: string;
  altitude: string;
  mode: Exclude<FenceDrawMode, "line">;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
};

type DrawingState =
  | { mode: "polygon"; points: Coordinate[]; preview: Coordinate | null }
  | { mode: "square"; start: Coordinate; current: Coordinate | null }
  | { mode: "circle"; center: Coordinate; edge: Coordinate | null };

export type CreateFenceWorkspaceProps = {
  fences: string[];
  onBack: () => void;
  onFencesChange: (fences: string[]) => void;
};

const DRAFT_SOURCE_ID = "create-fence-draft";
const SAVED_SOURCE_ID = "create-fence-saved";
const SAVED_LABEL_SOURCE_ID = "create-fence-saved-label";
const DRAFT_FILL_LAYER_ID = "create-fence-draft-fill";
const DRAFT_OUTLINE_LAYER_ID = "create-fence-draft-outline";
const SAVED_FILL_LAYER_ID = "create-fence-saved-fill";
const SAVED_OUTLINE_LAYER_ID = "create-fence-saved-outline";
const SAVED_LABEL_LAYER_ID = "create-fence-saved-label";

const FENCE_MODE_COLORS = {
  polygon: { fill: "#FF30C6", fillOpacity: 0.18, outline: "#FF30C6" },
  square: { fill: "#9E5CFF", fillOpacity: 0.18, outline: "#9E5CFF" },
  circle: { fill: "#00D68F", fillOpacity: 0.18, outline: "#00D68F" },
} as const;

function toFeatureCollection(
  features: Array<GeoJSON.Feature<GeoJSON.Polygon>>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features,
  };
}

function toLabelCollection(
  fences: SavedFence[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: fences.map((fence) => ({
      type: "Feature",
      properties: { name: fence.name },
      geometry: {
        type: "Point",
        coordinates: getPolygonLabelCoordinate(
          fence.geometry.geometry.coordinates[0] as Coordinate[],
        ),
      },
    })),
  };
}

function getPolygonLabelCoordinate(ring: Coordinate[]): Coordinate {
  const uniquePoints = ring.slice(0, -1);
  if (uniquePoints.length === 0) return [0, 0];

  const sum = uniquePoints.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]] as Coordinate,
    [0, 0],
  );

  return [sum[0] / uniquePoints.length, sum[1] / uniquePoints.length];
}

function closeRing(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return [];
  const [firstLng, firstLat] = points[0];
  const last = points[points.length - 1];
  if (last[0] === firstLng && last[1] === firstLat) return points;
  return [...points, [firstLng, firstLat]];
}

function buildPolygonFeature(
  points: Coordinate[],
  colors?: { fill: string; fillOpacity: number; outline: string },
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: colors
      ? {
          fillColor: colors.fill,
          fillOpacity: colors.fillOpacity,
          outlineColor: colors.outline,
        }
      : {},
    geometry: {
      type: "Polygon",
      coordinates: [closeRing(points)],
    },
  };
}

function buildRectanglePoints(start: Coordinate, end: Coordinate): Coordinate[] {
  const minLng = Math.min(start[0], end[0]);
  const maxLng = Math.max(start[0], end[0]);
  const minLat = Math.min(start[1], end[1]);
  const maxLat = Math.max(start[1], end[1]);

  return [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat],
  ];
}

function distanceBetween(a: Coordinate, b: Coordinate) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function isSameCoordinate(a: Coordinate | null, b: Coordinate | null) {
  if (!a || !b) return a === b;
  return a[0] === b[0] && a[1] === b[1];
}

function buildCirclePoints(center: Coordinate, edge: Coordinate, steps = 48): Coordinate[] {
  const radius = distanceBetween(center, edge);
  return Array.from({ length: steps }, (_, index) => {
    const theta = (index / steps) * Math.PI * 2;
    return [
      center[0] + radius * Math.cos(theta),
      center[1] + radius * Math.sin(theta),
    ] as Coordinate;
  });
}

function ensureFenceLayers(map: mapboxgl.Map) {
  if (!map.getSource(DRAFT_SOURCE_ID)) {
    map.addSource(DRAFT_SOURCE_ID, {
      type: "geojson",
      data: toFeatureCollection([]),
    });
  }

  if (!map.getLayer(DRAFT_FILL_LAYER_ID)) {
    map.addLayer({
      id: DRAFT_FILL_LAYER_ID,
      type: "fill",
      source: DRAFT_SOURCE_ID,
      slot: "top",
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#FF30C6"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.16],
        "fill-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getLayer(DRAFT_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: DRAFT_OUTLINE_LAYER_ID,
      type: "line",
      source: DRAFT_SOURCE_ID,
      slot: "top",
      paint: {
        "line-color": ["coalesce", ["get", "outlineColor"], "#FF30C6"],
        "line-width": 2,
        "line-opacity": 1,
        "line-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getSource(SAVED_SOURCE_ID)) {
    map.addSource(SAVED_SOURCE_ID, {
      type: "geojson",
      data: toFeatureCollection([]),
    });
  }

  if (!map.getLayer(SAVED_FILL_LAYER_ID)) {
    map.addLayer({
      id: SAVED_FILL_LAYER_ID,
      type: "fill",
      source: SAVED_SOURCE_ID,
      slot: "top",
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#FF30C6"],
        "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.16],
        "fill-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getLayer(SAVED_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: SAVED_OUTLINE_LAYER_ID,
      type: "line",
      source: SAVED_SOURCE_ID,
      slot: "top",
      paint: {
        "line-color": ["coalesce", ["get", "outlineColor"], "#FF30C6"],
        "line-width": 2,
        "line-opacity": 1,
        "line-color-use-theme": "disabled",
      },
    });
  }

  if (!map.getSource(SAVED_LABEL_SOURCE_ID)) {
    map.addSource(SAVED_LABEL_SOURCE_ID, {
      type: "geojson",
      data: toLabelCollection([]),
    });
  }

  if (!map.getLayer(SAVED_LABEL_LAYER_ID)) {
    map.addLayer({
      id: SAVED_LABEL_LAYER_ID,
      type: "symbol",
      source: SAVED_LABEL_SOURCE_ID,
      slot: "top",
      layout: {
        "text-field": ["get", "name"] as unknown as string,
        "text-size": 14,
        "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
        "text-offset": [0, 1.2],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#FF30C6",
        "text-halo-color": "rgba(0,0,0,0.72)",
        "text-halo-width": 1,
        "text-color-use-theme": "disabled",
      },
    });
  }
}

function updateFenceLayers(
  map: mapboxgl.Map,
  draftGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null,
  savedFences: SavedFence[],
) {
  ensureFenceLayers(map);

  const draftSource = map.getSource(DRAFT_SOURCE_ID) as mapboxgl.GeoJSONSource;
  draftSource.setData(toFeatureCollection(draftGeometry ? [draftGeometry] : []));

  const savedSource = map.getSource(SAVED_SOURCE_ID) as mapboxgl.GeoJSONSource;
  savedSource.setData(toFeatureCollection(savedFences.map((fence) => fence.geometry)));

  const labelSource = map.getSource(SAVED_LABEL_SOURCE_ID) as mapboxgl.GeoJSONSource;
  labelSource.setData(toLabelCollection(savedFences));
}

function clearDraftLayers(map: mapboxgl.Map) {
  const draftSource = map.getSource(DRAFT_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (draftSource) {
    draftSource.setData(toFeatureCollection([]));
  }
}

function setDraftLayerData(
  map: mapboxgl.Map,
  draftGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null,
) {
  ensureFenceLayers(map);
  const draftSource = map.getSource(DRAFT_SOURCE_ID) as mapboxgl.GeoJSONSource;
  draftSource.setData(toFeatureCollection(draftGeometry ? [draftGeometry] : []));
}

function applyMapDrawingMode(
  map: mapboxgl.Map,
  enabled: boolean,
) {
  const canvas = map.getCanvas();
  const canvasContainer = map.getCanvasContainer();

  if (enabled) {
    map.dragPan.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disableRotation();
    canvas.style.cursor = "crosshair";
    canvasContainer.style.cursor = "crosshair";
    return;
  }

  map.dragPan.enable();
  map.boxZoom.enable();
  map.dragRotate.enable();
  map.doubleClickZoom.enable();
  map.touchZoomRotate.enableRotation();
  canvas.style.cursor = "";
  canvasContainer.style.cursor = "";
}

export function CreateFenceWorkspace({
  fences,
  onBack,
  onFencesChange,
}: CreateFenceWorkspaceProps) {
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [activeMode, setActiveMode] = useState<FenceDrawMode | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [draftGeometry, setDraftGeometry] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAltitude, setDraftAltitude] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [savedFences, setSavedFences] = useState<SavedFence[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const drawingStateRef = useRef<DrawingState | null>(null);

  const draftNameError =
    showValidation && !draftName.trim() ? "Fence name is required." : "";
  const draftAltitudeError =
    showValidation && !draftAltitude.trim()
      ? "Altitude ceiling is required."
      : showValidation &&
          Number.isNaN(Number(draftAltitude.trim()))
        ? "Altitude ceiling must be a number."
        : "";
  const canSaveDraft =
    !!draftGeometry &&
    draftName.trim().length > 0 &&
    draftAltitude.trim().length > 0 &&
    !Number.isNaN(Number(draftAltitude.trim()));

  useEffect(() => {
    drawingStateRef.current = drawingState;
  }, [drawingState]);

  // Resolve the shared Mapbox instance once the dashboard map is ready.
  useEffect(() => {
    const existingMap = getMap();
    if (existingMap) {
      setMapInstance(existingMap);
      return;
    }

    const timer = window.setInterval(() => {
      const nextMap = getMap();
      if (!nextMap) return;
      setMapInstance(nextMap);
      window.clearInterval(timer);
    }, 150);

    return () => window.clearInterval(timer);
  }, []);

  // Keep the dedicated fence layers on the map synchronized with local workspace state.
  useEffect(() => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    updateFenceLayers(mapInstance, draftGeometry, savedFences);
  }, [draftGeometry, savedFences, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;

    applyMapDrawingMode(mapInstance, !!activeMode && !showMetadata);
  }, [activeMode, showMetadata, mapInstance]);

  // Attach drawing listeners only while a supported draw mode is active.
  useEffect(() => {
    if (!mapInstance || !activeMode || showMetadata) {
      return;
    }

    if (mapInstance.isStyleLoaded()) {
      ensureFenceLayers(mapInstance);
    }

    const activeColors =
      activeMode === "line" ? FENCE_MODE_COLORS.polygon : FENCE_MODE_COLORS[activeMode];

    const handlePolygonClick = (lngLat: mapboxgl.LngLat) => {
      setDrawingState((prev) => {
        if (!prev || prev.mode !== "polygon") {
          const nextState = {
            mode: "polygon",
            points: [[lngLat.lng, lngLat.lat]],
            preview: null,
          } satisfies DrawingState;
          drawingStateRef.current = nextState;
          return nextState;
        }

        const nextState = {
          ...prev,
          points: [...prev.points, [lngLat.lng, lngLat.lat]],
        } satisfies DrawingState;
        drawingStateRef.current = nextState;
        return nextState;
      });
    };

    const handleSquareClick = (lngLat: mapboxgl.LngLat) => {
      const point: Coordinate = [lngLat.lng, lngLat.lat];
      setDrawingState((prev) => {
        if (!prev || prev.mode !== "square") {
          const nextState = {
            mode: "square",
            start: point,
            current: point,
          } satisfies DrawingState;
          drawingStateRef.current = nextState;
          return nextState;
        }

        const rectangle = buildPolygonFeature(
          buildRectanglePoints(prev.start, point),
          activeColors,
        );
        drawingStateRef.current = null;
        setDraftGeometry(rectangle);
        setDraftName("");
        setDraftAltitude("");
        setShowValidation(false);
        setShowMetadata(true);
        return null;
      });
    };

    const handleCircleClick = (lngLat: mapboxgl.LngLat) => {
      const point: Coordinate = [lngLat.lng, lngLat.lat];
      setDrawingState((prev) => {
        if (!prev || prev.mode !== "circle") {
          const nextState = {
            mode: "circle",
            center: point,
            edge: point,
          } satisfies DrawingState;
          drawingStateRef.current = nextState;
          return nextState;
        }

        const circle = buildPolygonFeature(
          buildCirclePoints(prev.center, point),
          activeColors,
        );
        drawingStateRef.current = null;
        setDraftGeometry(circle);
        setDraftName("");
        setDraftAltitude("");
        setShowValidation(false);
        setShowMetadata(true);
        return null;
      });
    };

    const handlePointerClick = (event: mapboxgl.MapMouseEvent) => {
      event.preventDefault();
      if (activeMode === "polygon") handlePolygonClick(event.lngLat);
      if (activeMode === "square") handleSquareClick(event.lngLat);
      if (activeMode === "circle") handleCircleClick(event.lngLat);
    };

    const handleMouseMove = (event: mapboxgl.MapMouseEvent) => {
      const currentState = drawingStateRef.current;
      if (!currentState) return;

      const point: Coordinate = [event.lngLat.lng, event.lngLat.lat];
      if (currentState.mode === "polygon") {
        if (isSameCoordinate(currentState.preview, point)) return;
        const nextState = { ...currentState, preview: point } as DrawingState;
        drawingStateRef.current = nextState;
        const previewPoints = [...currentState.points, point];
        if (previewPoints.length >= 3) {
          setDraftLayerData(
            mapInstance,
            buildPolygonFeature(previewPoints, FENCE_MODE_COLORS.polygon),
          );
        }
        return;
      }

      if (currentState.mode === "square") {
        if (isSameCoordinate(currentState.current, point)) return;
        const nextState = { ...currentState, current: point } as DrawingState;
        drawingStateRef.current = nextState;
        setDraftLayerData(
          mapInstance,
          buildPolygonFeature(
            buildRectanglePoints(currentState.start, point),
            FENCE_MODE_COLORS.square,
          ),
        );
        return;
      }

      if (currentState.mode === "circle") {
        if (isSameCoordinate(currentState.edge, point)) return;
        const nextState = { ...currentState, edge: point } as DrawingState;
        drawingStateRef.current = nextState;
        setDraftLayerData(
          mapInstance,
          buildPolygonFeature(
            buildCirclePoints(currentState.center, point),
            FENCE_MODE_COLORS.circle,
          ),
        );
      }
    };

    const handleDoubleClick = (event: mapboxgl.MapMouseEvent) => {
      event.preventDefault();
      if (activeMode !== "polygon") return;

      setDrawingState((prev) => {
        if (!prev || prev.mode !== "polygon" || prev.points.length < 3) return prev;

        const polygon = buildPolygonFeature(prev.points, activeColors);
        drawingStateRef.current = null;
        setDraftGeometry(polygon);
        setDraftName("");
        setDraftAltitude("");
        setShowValidation(false);
        setShowMetadata(true);
        return null;
      });
    };

    mapInstance.on("click", handlePointerClick);
    mapInstance.on("mousemove", handleMouseMove);
    mapInstance.on("dblclick", handleDoubleClick);

    return () => {
      mapInstance.off("click", handlePointerClick);
      mapInstance.off("mousemove", handleMouseMove);
      mapInstance.off("dblclick", handleDoubleClick);
    };
  }, [activeMode, showMetadata, mapInstance]);

  // Convert in-progress drawing points into a live preview polygon on the map.
  useEffect(() => {
    if (!drawingState) {
      if (!showMetadata) setDraftGeometry(null);
      return;
    }

    if (drawingState.mode === "polygon") {
      const previewPoints = drawingState.preview
        ? [...drawingState.points, drawingState.preview]
        : drawingState.points;
      if (previewPoints.length >= 3) {
        setDraftGeometry(
          buildPolygonFeature(previewPoints, FENCE_MODE_COLORS.polygon),
        );
      }
      return;
    }

    if (drawingState.mode === "square" && drawingState.current) {
      setDraftGeometry(
        buildPolygonFeature(
          buildRectanglePoints(drawingState.start, drawingState.current),
          FENCE_MODE_COLORS.square,
        ),
      );
      return;
    }

    if (drawingState.mode === "circle" && drawingState.edge) {
      setDraftGeometry(
        buildPolygonFeature(
          buildCirclePoints(drawingState.center, drawingState.edge),
          FENCE_MODE_COLORS.circle,
        ),
      );
    }
  }, [drawingState, showMetadata]);

  useEffect(() => {
    return () => {
      if (mapInstance && mapInstance.isStyleLoaded()) {
        clearDraftLayers(mapInstance);
        updateFenceLayers(mapInstance, null, []);
      }
    };
  }, [mapInstance]);

  const handleModeSelect = (mode: FenceDrawMode) => {
    setActiveMode(mode);
    setDrawingState(null);
    drawingStateRef.current = null;
    setShowMetadata(false);
    setShowValidation(false);
    setDraftGeometry(null);

    const liveMap = mapInstance ?? getMap();
    if (liveMap) {
      setMapInstance(liveMap);
      applyMapDrawingMode(liveMap, true);
    }
  };

  const handleSaveFence = () => {
    if (!canSaveDraft || !draftGeometry) {
      setShowValidation(true);
      return;
    }

    const name = draftName.trim();

    setSavedFences((prev) => [
      ...prev,
      {
        name,
        altitude: draftAltitude,
        mode: activeMode === "line" || !activeMode ? "polygon" : activeMode,
        geometry: draftGeometry,
      },
    ]);
    onFencesChange([name, ...fences]);
    setShowMetadata(false);
    setShowValidation(false);
    setDrawingState(null);
    drawingStateRef.current = null;
    setDraftGeometry(null);
    setActiveMode(null);
  };

  const handleDeleteFence = (name: string) => {
    onFencesChange(fences.filter((fence) => fence !== name));
    setSavedFences((prev) => prev.filter((fence) => fence.name !== name));
  };

  return (
    <div className="relative flex min-h-0 flex-1 overflow-visible">
      <CreateFencePanel
        fences={fences}
        onBack={onBack}
        onDeleteFence={handleDeleteFence}
      />

      <FenceDrawToolbar activeMode={activeMode} onModeSelect={handleModeSelect} />

      {showMetadata ? (
        <FenceMetadataPopover
          name={draftName}
          altitude={draftAltitude}
          nameError={draftNameError}
          altitudeError={draftAltitudeError}
          canSave={canSaveDraft}
          onNameChange={(value) => {
            setDraftName(value);
          }}
          onAltitudeChange={(value) => {
            setDraftAltitude(value);
          }}
          onCancel={() => {
            setShowMetadata(false);
            setShowValidation(false);
            setActiveMode(null);
            setDrawingState(null);
            drawingStateRef.current = null;
            setDraftGeometry(null);
            if (mapInstance && mapInstance.isStyleLoaded()) {
              updateFenceLayers(mapInstance, null, savedFences);
            }
          }}
          onSave={handleSaveFence}
        />
      ) : null}
    </div>
  );
}
