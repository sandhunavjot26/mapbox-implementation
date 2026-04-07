/**
 * Landing map framing — Figma COP scale (Rajasthan / Jaipur–Kota corridor), not full India.
 * Mission pins on the map are intentionally not used; missions are chosen from the overlay menu.
 */

import type { FitBoundsOptions, Map as MapboxMap } from "mapbox-gl";

/**
 * Regional bounds matching Figma reference (Jaipur, Tonk, Kota visible in one frame).
 * [[swLng, swLat], [neLng, neLat]]
 */
export const LANDING_REGION_BOUNDS: [[number, number], [number, number]] = [
  [73.35, 24.55],
  [78.55, 27.95],
];

/** Allow a closer end zoom for the mission selected assets. */
export const MAX_ZOOM_LANDING = 7.35;

export function getLandingFitOptions(): FitBoundsOptions {
  return {
    padding: { top: 80, bottom: 140, left: 64, right: 64 },
    pitch: 55,
    bearing: -20,
    duration: 5000,
    essential: true,
    maxZoom: MAX_ZOOM_LANDING,
  };
}

export function getLandingEaseOptions(): FitBoundsOptions {
  return {
    padding: { top: 80, bottom: 140, left: 64, right: 64 },
    duration: 2000,
    maxZoom: MAX_ZOOM_LANDING,
  };
}

/** @deprecated Use LANDING_REGION_BOUNDS */
export const INDIA_BOUNDS = LANDING_REGION_BOUNDS;

export function fitMapToLandingRegion(map: MapboxMap): void {
  map.fitBounds(LANDING_REGION_BOUNDS, getLandingFitOptions());
}

export function easeMapToLandingRegion(map: MapboxMap): void {
  map.fitBounds(LANDING_REGION_BOUNDS, getLandingEaseOptions());
}

/** Legacy names kept for MapContainer call sites */
export const fitMapToIndia = fitMapToLandingRegion;
export const easeMapToIndia = easeMapToLandingRegion;
