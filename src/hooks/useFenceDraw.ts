import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { getMap, subscribeToMap } from "@/components/map/mapController";
import type { FenceDrawMode } from "@/components/missions/FenceDrawToolbar";
import type { SavedFence } from "@/types/aeroshield";
import {
  type Coordinate,
  FENCE_MODE_COLORS,
  buildPolygonFeature,
  buildRectanglePoints,
  buildCirclePoints,
  isSameCoordinate,
} from "@/utils/fenceGeometry";
import {
  ensureFenceLayers,
  syncFenceLayersToMap,
  setDraftLayerData,
  removeFenceLayers,
} from "@/components/map/layers/fence";

export type DrawingState =
  | { mode: "polygon"; points: Coordinate[]; preview: Coordinate | null }
  | { mode: "square"; start: Coordinate; current: Coordinate | null }
  | { mode: "circle"; center: Coordinate; edge: Coordinate | null };

type MapInteractionSnapshot = {
  dragPan: boolean;
  boxZoom: boolean;
  dragRotate: boolean;
  doubleClickZoom: boolean;
};

function snapshotMapInteractions(map: mapboxgl.Map): MapInteractionSnapshot {
  return {
    dragPan: map.dragPan.isEnabled(),
    boxZoom: map.boxZoom.isEnabled(),
    dragRotate: map.dragRotate.isEnabled(),
    doubleClickZoom: map.doubleClickZoom.isEnabled(),
  };
}

function applyMapDrawingMode(map: mapboxgl.Map, enabled: boolean) {
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

  canvas.style.cursor = "";
  canvasContainer.style.cursor = "";
}

function restoreMapInteractions(
  map: mapboxgl.Map,
  snapshot: MapInteractionSnapshot,
) {
  if (snapshot.dragPan) map.dragPan.enable();
  if (snapshot.boxZoom) map.boxZoom.enable();
  if (snapshot.dragRotate) map.dragRotate.enable();
  if (snapshot.doubleClickZoom) map.doubleClickZoom.enable();
}

export interface UseFenceDrawOptions {
  /** When true, drawing listeners are paused (e.g. while metadata popover is shown). */
  paused: boolean;
  /** Called when a shape drawing completes and geometry is ready for metadata entry. */
  onShapeComplete: () => void;
  /** Parent-owned saved fences; map layers mirror this (single source of truth). */
  savedFences: SavedFence[];
}

export type ResetDrawingOptions = {
  /**
   * When saving a fence, React may not have committed parent `savedFences` yet.
   * Pass the list that should appear on the map immediately so the layer is not empty between draft clear and effect.
   */
  mapSavedFences?: SavedFence[];
};

export interface UseFenceDrawResult {
  mapInstance: mapboxgl.Map | null;
  activeMode: FenceDrawMode | null;
  draftGeometry: GeoJSON.Feature<GeoJSON.Polygon> | null;
  setDraftGeometry: (g: GeoJSON.Feature<GeoJSON.Polygon> | null) => void;
  handleModeSelect: (mode: FenceDrawMode) => void;
  resetDrawing: (opts?: ResetDrawingOptions) => void;
}

export function useFenceDraw({
  paused,
  onShapeComplete,
  savedFences,
}: UseFenceDrawOptions): UseFenceDrawResult {
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [activeMode, setActiveMode] = useState<FenceDrawMode | null>(null);
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [draftGeometry, setDraftGeometry] =
    useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);

  const drawingStateRef = useRef<DrawingState | null>(null);
  const interactionSnapshotRef = useRef<MapInteractionSnapshot | null>(null);
  const draftGeometryRef = useRef<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const savedFencesRef = useRef<SavedFence[]>([]);
  const onShapeCompleteRef = useRef(onShapeComplete);

  useEffect(() => { onShapeCompleteRef.current = onShapeComplete; }, [onShapeComplete]);
  useEffect(() => { drawingStateRef.current = drawingState; }, [drawingState]);
  useEffect(() => { draftGeometryRef.current = draftGeometry; }, [draftGeometry]);
  useEffect(() => { savedFencesRef.current = savedFences; }, [savedFences]);

  // Resolve the shared Mapbox instance via subscription instead of polling.
  useEffect(() => {
    return subscribeToMap((map) => {
      setMapInstance(map);
    });
  }, []);

  /** Paint fence sources/layers from React state; layout effect reduces flash after save. */
  useLayoutEffect(() => {
    const map = getMap() ?? mapInstance;
    if (!map) return;
    savedFencesRef.current = savedFences;
    draftGeometryRef.current = draftGeometry;

    syncFenceLayersToMap(map, draftGeometry, savedFences);
  }, [draftGeometry, savedFences, mapInstance]);

  // Map interaction snapshot/restore.
  useEffect(() => {
    const map = getMap() ?? mapInstance;
    if (!map) return;
    const shouldDraw = !!activeMode && !paused;
    if (shouldDraw) {
      if (!interactionSnapshotRef.current) {
        interactionSnapshotRef.current = snapshotMapInteractions(map);
      }
      applyMapDrawingMode(map, true);
    } else {
      applyMapDrawingMode(map, false);
      if (interactionSnapshotRef.current) {
        restoreMapInteractions(map, interactionSnapshotRef.current);
        interactionSnapshotRef.current = null;
      }
    }
  }, [activeMode, paused, mapInstance]);

  // Drawing listeners — active only when mode is set and not paused.
  useEffect(() => {
    const map = getMap() ?? mapInstance;
    if (!map || !activeMode || paused) return;
    if (map.isStyleLoaded()) ensureFenceLayers(map);

    const activeColors =
      activeMode === "line" ? FENCE_MODE_COLORS.polygon : FENCE_MODE_COLORS[activeMode];

    const completeShape = (feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
      drawingStateRef.current = null;
      setDrawingState(null);
      setDraftGeometry(feature);
      onShapeCompleteRef.current();
    };

    const handlePolygonClick = (lngLat: mapboxgl.LngLat) => {
      const cur = drawingStateRef.current;
      if (!cur || cur.mode !== "polygon") {
        const next: DrawingState = {
          mode: "polygon",
          points: [[lngLat.lng, lngLat.lat]],
          preview: null,
        };
        drawingStateRef.current = next;
        setDrawingState(next);
        return;
      }
      const next: DrawingState = {
        ...cur,
        points: [...cur.points, [lngLat.lng, lngLat.lat]],
      };
      drawingStateRef.current = next;
      setDrawingState(next);
    };

    const handleSquareClick = (lngLat: mapboxgl.LngLat) => {
      const pt: Coordinate = [lngLat.lng, lngLat.lat];
      const cur = drawingStateRef.current;
      if (!cur || cur.mode !== "square") {
        const next: DrawingState = { mode: "square", start: pt, current: pt };
        drawingStateRef.current = next;
        setDrawingState(next);
        return;
      }
      completeShape(
        buildPolygonFeature(buildRectanglePoints(cur.start, pt), activeColors),
      );
    };

    const handleCircleClick = (lngLat: mapboxgl.LngLat) => {
      const pt: Coordinate = [lngLat.lng, lngLat.lat];
      const cur = drawingStateRef.current;
      if (!cur || cur.mode !== "circle") {
        const next: DrawingState = { mode: "circle", center: pt, edge: pt };
        drawingStateRef.current = next;
        setDrawingState(next);
        return;
      }
      completeShape(
        buildPolygonFeature(buildCirclePoints(cur.center, pt), activeColors),
      );
    };

    const handlePointerClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
      if (activeMode === "polygon") handlePolygonClick(e.lngLat);
      if (activeMode === "square") handleSquareClick(e.lngLat);
      if (activeMode === "circle") handleCircleClick(e.lngLat);
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const cur = drawingStateRef.current;
      if (!cur) return;
      const pt: Coordinate = [e.lngLat.lng, e.lngLat.lat];

      if (cur.mode === "polygon") {
        if (isSameCoordinate(cur.preview, pt)) return;
        drawingStateRef.current = { ...cur, preview: pt };
        const preview = [...cur.points, pt];
        if (preview.length >= 3) {
          setDraftLayerData(map, buildPolygonFeature(preview, FENCE_MODE_COLORS.polygon));
        }
        return;
      }
      if (cur.mode === "square") {
        if (isSameCoordinate(cur.current, pt)) return;
        drawingStateRef.current = { ...cur, current: pt };
        setDraftLayerData(
          map,
          buildPolygonFeature(buildRectanglePoints(cur.start, pt), FENCE_MODE_COLORS.square),
        );
        return;
      }
      if (cur.mode === "circle") {
        if (isSameCoordinate(cur.edge, pt)) return;
        drawingStateRef.current = { ...cur, edge: pt };
        setDraftLayerData(
          map,
          buildPolygonFeature(buildCirclePoints(cur.center, pt), FENCE_MODE_COLORS.circle),
        );
      }
    };

    const handleDoubleClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
      if (activeMode !== "polygon") return;
      const cur = drawingStateRef.current;
      if (!cur || cur.mode !== "polygon" || cur.points.length < 3) return;
      completeShape(buildPolygonFeature(cur.points, activeColors));
    };

    map.on("click", handlePointerClick);
    map.on("mousemove", handleMouseMove);
    map.on("dblclick", handleDoubleClick);
    return () => {
      map.off("click", handlePointerClick);
      map.off("mousemove", handleMouseMove);
      map.off("dblclick", handleDoubleClick);
    };
  }, [activeMode, paused, mapInstance]);

  // Style reload reattach.
  useEffect(() => {
    const map = getMap() ?? mapInstance;
    if (!map) return;
    const handle = () => {
      syncFenceLayersToMap(
        map,
        draftGeometryRef.current,
        savedFencesRef.current,
      );
    };
    map.on("style.load", handle);
    return () => { map.off("style.load", handle); };
  }, [mapInstance]);

  // Drawing-state → draftGeometry sync for React-driven previews.
  useEffect(() => {
    if (!drawingState) {
      if (!paused) setDraftGeometry(null);
      return;
    }
    if (drawingState.mode === "polygon") {
      const pts = drawingState.preview
        ? [...drawingState.points, drawingState.preview]
        : drawingState.points;
      if (pts.length >= 3) {
        setDraftGeometry(buildPolygonFeature(pts, FENCE_MODE_COLORS.polygon));
      }
      return;
    }
    if (drawingState.mode === "square" && drawingState.current) {
      setDraftGeometry(
        buildPolygonFeature(buildRectanglePoints(drawingState.start, drawingState.current), FENCE_MODE_COLORS.square),
      );
      return;
    }
    if (drawingState.mode === "circle" && drawingState.edge) {
      setDraftGeometry(
        buildPolygonFeature(buildCirclePoints(drawingState.center, drawingState.edge), FENCE_MODE_COLORS.circle),
      );
    }
  }, [drawingState, paused]);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      if (!mapInstance) return;
      if (mapInstance.isStyleLoaded()) removeFenceLayers(mapInstance);
      if (interactionSnapshotRef.current) {
        restoreMapInteractions(mapInstance, interactionSnapshotRef.current);
        interactionSnapshotRef.current = null;
      }
      const canvas = mapInstance.getCanvas();
      const container = mapInstance.getCanvasContainer();
      canvas.style.cursor = "";
      container.style.cursor = "";
    };
  }, [mapInstance]);

  const handleModeSelect = (mode: FenceDrawMode) => {
    setActiveMode(mode);
    setDrawingState(null);
    drawingStateRef.current = null;
    setDraftGeometry(null);

    const map = getMap() ?? mapInstance;
    if (map) {
      setMapInstance(map);
      if (!interactionSnapshotRef.current) {
        interactionSnapshotRef.current = snapshotMapInteractions(map);
      }
      applyMapDrawingMode(map, true);
    }
  };

  const resetDrawing = (opts?: ResetDrawingOptions) => {
    setActiveMode(null);
    setDrawingState(null);
    drawingStateRef.current = null;
    setDraftGeometry(null);
    draftGeometryRef.current = null;

    const saved =
      opts?.mapSavedFences ?? savedFencesRef.current;
    if (opts?.mapSavedFences) {
      savedFencesRef.current = opts.mapSavedFences;
    }

    const map = getMap() ?? mapInstance;
    if (!map) return;

    syncFenceLayersToMap(map, null, saved);
  };

  return {
    mapInstance,
    activeMode,
    draftGeometry,
    setDraftGeometry,
    handleModeSelect,
    resetDrawing,
  };
}
