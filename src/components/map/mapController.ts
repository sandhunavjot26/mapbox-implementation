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
  entityType: EntityType;
  data: Asset | Target;
  screenPosition: { x: number; y: number };
}

// Internal popup state
let currentPopupState: PopupState | null = null;

// Subscriber callbacks for popup state changes
type PopupSubscriber = (state: PopupState | null) => void;
const popupSubscribers: Set<PopupSubscriber> = new Set();

// Notify all subscribers of popup state change
function notifyPopupSubscribers() {
  popupSubscribers.forEach((callback) => callback(currentPopupState));
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

// Show hover popup
export function showHoverPopup(
  entityType: EntityType,
  data: Asset | Target,
  lngLat: mapboxgl.LngLat
) {
  if (!mapInstance) return;

  // Convert lngLat to screen coordinates
  const point = mapInstance.project(lngLat);

  currentPopupState = {
    visible: true,
    entityType,
    data,
    screenPosition: { x: point.x, y: point.y },
  };

  notifyPopupSubscribers();
}

// Hide hover popup
export function hideHoverPopup() {
  if (currentPopupState) {
    currentPopupState = null;
    notifyPopupSubscribers();
  }
}

// Update popup position (called on map move/zoom)
export function updatePopupPosition(lngLat: mapboxgl.LngLat) {
  if (!mapInstance || !currentPopupState) return;

  const point = mapInstance.project(lngLat);
  currentPopupState = {
    ...currentPopupState,
    screenPosition: { x: point.x, y: point.y },
  };

  notifyPopupSubscribers();
}

// ============================================================
// Map Reference Management
// ============================================================

// Set map reference
export function setMap(map: mapboxgl.Map | null) {
  mapInstance = map;
  // Clear selection state when map changes
  selectedAssetId = null;
  selectedTargetId = null;
  // Clear popup state
  currentPopupState = null;
  notifyPopupSubscribers();
}

// Get map reference (for internal use)
export function getMap(): mapboxgl.Map | null {
  return mapInstance;
}

// Clear all selections
export function clearSelection() {
  if (!mapInstance) return;

  // Clear previous asset selection
  if (selectedAssetId && mapInstance.getSource("assets")) {
    mapInstance.setFeatureState(
      { source: "assets", id: selectedAssetId },
      { selected: false }
    );
  }

  // Clear previous target selection
  if (selectedTargetId && mapInstance.getSource("targets")) {
    mapInstance.setFeatureState(
      { source: "targets", id: selectedTargetId },
      { selected: false }
    );
  }

  selectedAssetId = null;
  selectedTargetId = null;
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
