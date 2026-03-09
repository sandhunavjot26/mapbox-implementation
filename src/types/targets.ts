/**
 * Target types — canonical target interface for the app.
 * Superset of the original mock Target, with API-sourced fields (deviceId, eventId).
 * Classification: default UNKNOWN; client-side reclassification only (no backend support).
 */

export type TargetClassification = "FRIENDLY" | "ENEMY" | "UNKNOWN";

export interface Target {
  id: string;
  classification: TargetClassification;
  distanceKm: number;
  altitude: number; // feet
  frequencyMHz: number;
  rssi: number; // dBm
  heading: number; // degrees
  coordinates: [number, number]; // [lng, lat]
  speedKmH?: number; // km/h
  deviceId?: string | null; // detecting device (from API events)
  eventId?: string; // event ID (from API events)
  /** Human-readable name from TRACK_UPDATE (e.g. "DJI Phantom 4") */
  targetName?: string;
  /** Detection confidence 0–100 from TRACK_UPDATE/DETECTED */
  confidence?: number;
  /** Last update timestamp (ms) — for staleness indicator */
  lastSeenAt?: number;
  /** Bandwidth in MHz (from bandwidth_khz) */
  bandwidthMHz?: number;
  /** RC/GCS coordinates [lon, lat] */
  rcCoords?: [number, number];
  /** True when backend signals TRACK_LOST — target is removed or greyed */
  lost?: boolean;
}
