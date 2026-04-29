/**
 * Target types — canonical target interface for the app.
 * Superset of the original mock Target, with API-sourced fields (deviceId, eventId).
 * Classification: default UNKNOWN; client-side reclassification only (no backend support).
 */

import type { TrackRatedPriority, TrackRatedStatus } from "@/types/aeroshield";

// UI renders FRIENDLY/ENEMY only; UNKNOWN kept for API compat and treated as ENEMY in the overlay (PRD §12.4)
export type TargetClassification = "FRIENDLY" | "ENEMY" | "UNKNOWN";

/** Latest TRACK_RATED from wire or mission load fold — does not replace tri-state `classification` */
export interface TargetRating {
  status: TrackRatedStatus;
  priority: TrackRatedPriority | null;
  ratedBy?: string;
  ratedAt: number;
}

/** THREAT_ESCALATION from events WebSocket (§E.1) */
export interface TargetThreat {
  level: "HIGH" | "CRITICAL";
  score: number;
  reasons: string[];
  stampedAt: number;
}

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
  /** §E.1 TRACK_RATED — last write wins; separate from FRIENDLY/ENEMY/UNKNOWN */
  rating?: TargetRating;
  /** §E.1 THREAT_ESCALATION */
  threat?: TargetThreat;
  /** From DETECTED uav when backend derived coordinates from range + azimuth. */
  positionDerived?: boolean;
  targetUidSynthesised?: boolean;
  /** Vendor-reported id (groups with mission devices in Detections list). */
  monitorDeviceId?: number;
}
