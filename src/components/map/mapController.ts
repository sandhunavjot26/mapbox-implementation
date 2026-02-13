import mapboxgl from "mapbox-gl";
import { Asset } from "@/mock/assets";
import { Target } from "@/mock/targets";

// Map reference singleton
let mapInstance: mapboxgl.Map | null = null;

// Selection state (only one asset OR target can be selected at a time)
let selectedAssetId: string | null = null;
let selectedTargetId: string | null = null;

// ============================================================
// Popup State Management
// ============================================================

export type EntityType = "asset" | "target";

export interface PopupState {
  visible: boolean;
  isPinned: boolean;
  entityType: EntityType;
  data: Asset | Target;
  screenPosition: { x: number; y: number };
}

// Internal popup state
let currentPopupState: PopupState | null = null;

// Pinned entity (click-to-pin); when set, hover is ignored
let selectedEntity: {
  entityType: EntityType;
  data: Asset | Target;
  lngLat: mapboxgl.LngLat;
} | null = null;

// Subscriber callbacks for popup state changes
type PopupSubscriber = (state: PopupState | null) => void;
const popupSubscribers: Set<PopupSubscriber> = new Set();

// Notify all subscribers of popup state change
function notifyPopupSubscribers() {
  popupSubscribers.forEach((callback) => callback(currentPopupState));
}

// Convert lngLat to viewport coordinates (for fixed-position popup)
function lngLatToViewport(lngLat: mapboxgl.LngLat): { x: number; y: number } {
  if (!mapInstance) return { x: 0, y: 0 };
  const point = mapInstance.project(lngLat);
  const rect = mapInstance.getContainer().getBoundingClientRect();
  return { x: rect.left + point.x, y: rect.top + point.y };
}

// Subscribe to popup state changes
export function subscribeToPopup(callback: PopupSubscriber): () => void {
  popupSubscribers.add(callback);
  // Immediately call with current state
  callback(currentPopupState);
  // Return unsubscribe function
  return () => {
    popupSubscribers.delete(callback);
  };
}

// Read current popup state (for consumers that need to sync with selection)
export function getPopupState(): PopupState | null {
  return currentPopupState;
}

// Show hover popup (ignored when an entity is pinned)
export function showHoverPopup(
  entityType: EntityType,
  data: Asset | Target,
  lngLat: mapboxgl.LngLat
) {
  if (!mapInstance) return;
  if (selectedEntity) return; // Hover disabled while pinned

  const screenPosition = lngLatToViewport(lngLat);

  currentPopupState = {
    visible: true,
    isPinned: false,
    entityType,
    data,
    screenPosition,
  };

  notifyPopupSubscribers();
}

// Hide hover popup (only if no pinned entity)
export function hideHoverPopup() {
  if (selectedEntity) return; // Keep showing pinned popup
  if (currentPopupState) {
    currentPopupState = null;
    notifyPopupSubscribers();
  }
}

// Update popup position (called on map move/zoom)
export function updatePopupPosition(lngLat: mapboxgl.LngLat) {
  if (!mapInstance || !currentPopupState) return;

  currentPopupState = {
    ...currentPopupState,
    screenPosition: lngLatToViewport(lngLat),
  };

  notifyPopupSubscribers();
}

// Pin popup to selected entity (click on asset/target)
export function selectEntity(
  entityType: EntityType,
  data: Asset | Target,
  lngLat: mapboxgl.LngLat
) {
  if (!mapInstance) return;

  // Clear previous map feature-state and pinned popup
  clearSelection();

  selectedEntity = { entityType, data, lngLat };

  // Highlight on map
  const id = "id" in data ? data.id : "";
  if (entityType === "asset" && mapInstance.getSource("assets")) {
    mapInstance.setFeatureState({ source: "assets", id }, { selected: true });
    selectedAssetId = id;
  } else if (entityType === "target" && mapInstance.getSource("targets")) {
    mapInstance.setFeatureState({ source: "targets", id }, { selected: true });
    selectedTargetId = id;
  }

  currentPopupState = {
    visible: true,
    isPinned: true,
    entityType,
    data,
    screenPosition: lngLatToViewport(lngLat),
  };

  notifyPopupSubscribers();
}

// Whether an entity is currently pinned (popup selected)
export function isEntitySelected(): boolean {
  return selectedEntity !== null;
}

// Update pinned popup screen position (call on map move/zoom)
export function updatePinnedPopupPosition() {
  if (!mapInstance || !selectedEntity) return;

  if (currentPopupState && currentPopupState.isPinned) {
    currentPopupState = {
      ...currentPopupState,
      screenPosition: lngLatToViewport(selectedEntity.lngLat),
    };
    notifyPopupSubscribers();
  }
}

// ============================================================
// Map Reference Management
// ============================================================

// Set map reference
export function setMap(map: mapboxgl.Map | null) {
  mapInstance = map;
  selectedAssetId = null;
  selectedTargetId = null;
  selectedEntity = null;
  currentPopupState = null;
  notifyPopupSubscribers();
}

// Get map reference (for internal use)
export function getMap(): mapboxgl.Map | null {
  return mapInstance;
}

// Clear all selections (map highlight + pinned popup)
export function clearSelection() {
  if (!mapInstance) return;

  // Clear map feature-state
  if (selectedAssetId && mapInstance.getSource("assets")) {
    mapInstance.setFeatureState(
      { source: "assets", id: selectedAssetId },
      { selected: false }
    );
  }
  if (selectedTargetId && mapInstance.getSource("targets")) {
    mapInstance.setFeatureState(
      { source: "targets", id: selectedTargetId },
      { selected: false }
    );
  }

  selectedAssetId = null;
  selectedTargetId = null;
  selectedEntity = null;
  currentPopupState = null;
  notifyPopupSubscribers();
}

// Select an asset (clears any target selection)
export function selectAsset(assetId: string) {
  if (!mapInstance) {
    console.warn("Map not initialized");
    return;
  }

  // Clear all previous selections
  clearSelection();

  // Set new asset selection
  if (mapInstance.getSource("assets")) {
    mapInstance.setFeatureState(
      { source: "assets", id: assetId },
      { selected: true }
    );
    selectedAssetId = assetId;
  }
}

// Select a target (clears any asset selection)
export function selectTarget(targetId: string) {
  if (!mapInstance) {
    console.warn("Map not initialized");
    return;
  }

  // Clear all previous selections
  clearSelection();

  // Set new target selection
  if (mapInstance.getSource("targets")) {
    mapInstance.setFeatureState(
      { source: "targets", id: targetId },
      { selected: true }
    );
    selectedTargetId = targetId;
  }
}

// Fly to an asset location
export function flyToAsset(asset: Asset) {
  if (!mapInstance) {
    console.warn("Map not initialized");
    return;
  }

  mapInstance.flyTo({
    center: asset.coordinates,
    zoom: 14,
    duration: 1500,
    essential: true,
  });
}

// Fly to a target location
export function flyToTarget(target: Target) {
  if (!mapInstance) {
    console.warn("Map not initialized");
    return;
  }

  mapInstance.flyTo({
    center: target.coordinates,
    zoom: 15,
    duration: 1500,
    essential: true,
  });
}
