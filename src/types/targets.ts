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
}
