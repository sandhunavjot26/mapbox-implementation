/**
 * AeroShield API types — matches backend schemas from device/command/auth services.
 * Used for REST responses, WebSocket payloads, and UI data contracts.
 */

// --- Auth ---
export interface AuthLoginResponse {
  access_token: string;
  token_type?: string;
  roles: string[];
  permissions: string[];
  scopes: {
    global: boolean;
    missions: string[];
    devices: string[];
    sites?: string[];
  };
}

// --- Missions ---
/** Optional list fields when API returns them (Figma mission cards). */
export interface Mission {
  id: string;
  name: string;
  aop: string | null;
  border_geojson: GeoJSON.Polygon | null;
  /** e.g. LIVE_OPS, TRAINING_SIM, ACTIVE, COMPLETED — see missionListUi resolver */
  status?: string | null;
  created_at?: string | null;
}

export interface MissionLoad extends Mission {
  zones: Zone[];
  features: MissionFeature[];
  devices: Device[];
}

// --- Zones (TL-1/TL-2) ---
export interface Zone {
  id: string;
  label: string;
  priority: number;
  zone_geojson: GeoJSON.Polygon;
  action_plan: {
    notify?: string[];
    actions?: string[];
    sla_seconds?: number;
  };
}

// --- Fences (create-mission workspace) ---
export type FenceDrawTool = "polygon" | "square" | "circle";

export interface SavedFence {
  name: string;
  altitude: string;
  mode: FenceDrawTool;
  geometry: GeoJSON.Feature<GeoJSON.Polygon>;
}

// --- Features (roads, markers, etc.) ---
export interface MissionFeature {
  id: string;
  feature_type: string;
  geojson: GeoJSON.Feature;
  properties?: Record<string, unknown>;
}

// --- Devices (towers/sensors) ---
export type DeviceType = "DETECTION" | "JAMMER" | "DETECTION_JAMMER";
export type DeviceStatus =
  | "ONLINE"
  | "OFFLINE"
  | "UNKNOWN"
  | "WORKING"
  | "IDLE";

export interface Device {
  id: string;
  name: string;
  serial_number: string;
  mission_id: string | null;
  device_type: DeviceType;
  /** Protocol model name, e.g. `AS_2.0G` (GET/PATCH in §B.2) */
  protocol?: string | null;
  color: string | null;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  detection_radius_m: number | null;
  jammer_radius_m: number | null;
  breach_green_m?: number | null;
  breach_yellow_m?: number | null;
  breach_red_m?: number | null;
  detection_beam_deg?: number | null;
  jammer_beam_deg?: number | null;
  monitor_device_id?: number;
}

/** Partial PATCH body for `PATCH /api/v1/devices/{id}`. Omitted = unchanged. */
export type DevicePatch = Partial<{
  name: string;
  color: string | null;
  mission_id: string | null;
  device_type: DeviceType;
  protocol: string;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  detection_radius_m: number;
  jammer_radius_m: number;
  breach_green_m: number;
  breach_yellow_m: number;
  breach_red_m: number;
  detection_beam_deg: number | null;
  jammer_beam_deg: number | null;
}>;

/** `GET /api/v1/protocols` item (§B.11) */
export interface ProtocolOut {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  edge_plugin: string;
  capabilities: string[];
  enabled: boolean;
  default_breach_green_m?: number;
  default_breach_yellow_m?: number;
  default_breach_red_m?: number;
  default_detection_beam_deg?: number;
  default_jammer_beam_deg?: number;
}

// --- Mission Events (DETECTED, COMMAND_SENT, JAM_STARTED, etc.) ---
export interface MissionEvent {
  id: string;
  mission_id: string;
  device_id: string | null;
  event_type: string;
  ts: string;
  payload: Record<string, unknown> | null;
}

/**
 * TRACK_UPDATE payload — flat structure from events WebSocket.
 * Continuous position updates for existing tracks (different from DETECTED which has nested uav).
 */
export interface TrackUpdatePayload {
  target_uid: string;
  target_name?: string;
  lat: number;
  lon: number;
  speed_mps?: number;
  heading_deg?: number;
  azimuth_deg?: number;
  distance_m?: number;
  confidence?: number;
  source?: string;
}

// DETECTED payload.uav structure (from dt56 parser)
export interface DetectedUavPayload {
  target_uid: string;
  target_id?: number;
  target_name?: string;
  uav_lon: number;
  uav_lat: number;
  alt_asl_m?: number;
  alt_agl_m?: number;
  azimuth_deg?: number;
  distance_m?: number;
  freq_khz?: number;
  signal_db?: number;
  speed_mps?: number;
  confidence?: number;
  rc_lon?: number;
  rc_lat?: number;
  bandwidth_khz?: number;
  identify_timestamp?: number;
  return_lon?: number;
  return_lat?: number;
  drone_type?: number;
  drone_number?: number;
}

/** §E.1 — TRACK_RATED (operator + system:swarm-tag) */
export type TrackRatedStatus =
  | "CONFIRMED"
  | "DISMISSED"
  | "FALSE_POSITIVE"
  | "UNRATED";
export type TrackRatedPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TrackRatedPayload {
  target_uid: string;
  target_name?: string;
  status: TrackRatedStatus;
  priority: TrackRatedPriority | null;
  rated_by?: string;
}

/** §E.1 — THREAT_ESCALATION */
export interface ThreatEscalationPayload {
  target_uid: string;
  target_name?: string;
  level: "HIGH" | "CRITICAL";
  score: number;
  reasons: string[];
}

/** §E.1 — NFZ_BREACH_PREDICTED */
export interface NfzBreachPredictedPayload {
  target_uid: string;
  target_name?: string;
  head: [number, number];
  n_fixes: number;
}

/** §E.1 — BREACH_RING_ENTERED */
export type BreachRing = "GREEN" | "YELLOW" | "RED";

export interface BreachRingEnteredPayload {
  target_uid: string;
  target_name?: string;
  ring: BreachRing;
  position: [number, number];
  radar_id?: string;
  radar_name?: string;
}

/** §E.1 — DEVICE_AZIMUTH (change-based) */
export interface DeviceAzimuthPayload {
  device_id: string;
  monitor_device_id?: number;
  azimuth_deg: number;
  elevation_deg?: number;
  delta_deg?: number;
}

/** §E.1 — DEVICE_ONLINE / DEVICE_OFFLINE (mission_event stream) */
export interface DeviceOnlineEventPayload {
  device_id: string;
  monitor_device_id?: number;
  serial_number?: string;
  name?: string;
}

export interface DeviceOfflineEventPayload extends DeviceOnlineEventPayload {
  last_seen_age_seconds?: number;
  threshold_seconds?: number;
}

/** §B.9 / B.8 — SWARM_DETECTED */
export interface SwarmDetectedPayload {
  source: string;
  swarm_id: string;
  label?: string;
  severity: string;
  approach_bearing_deg?: number;
  target_uids: string[];
  notes?: string;
  size: number;
}

// --- Command policies (Section 9) ---
export interface CommandPolicy {
  command_type: string;
  required_approvals: number;
  auto_send: boolean;
  timeout_seconds: number;
}

// --- Commands ---
export interface CommandRequest {
  mission_id: string;
  device_id: string;
  command_type: string;
  payload?: Record<string, unknown>;
}

export interface CommandOut {
  id: string;
  mission_id: string;
  device_id: string | null;
  monitor_device_id: number;
  command_type: string;
  datatype: number;
  packet_no: number | null;
  status: string;
  required_approvals: number;
  approved_count: number;
  last_error: string | null;
}

// --- Map GeoJSON (from GET /missions/{id}/map/features) ---
export type MapFeatureCollection = GeoJSON.FeatureCollection;

// --- WebSocket message types ---
export interface WsMissionEvent {
  type: "mission_event";
  event: {
    event_type: string;
    payload: Record<string, unknown>;
  };
}

export interface WsDeviceOnline {
  type: "device_online";
  device_id: string;
  monitor_device_id: number;
  name: string;
  last_seen: string;
}

export interface WsDeviceStateUpdate {
  type: "device_state_update";
  device_id: string;
  monitor_device_id: number;
  status: string;
  last_seen: string;
  op_status?: string | number;
}

export interface WsCommandUpdate {
  type: "command_update";
  command: {
    id: string;
    status: string;
    approved_count?: number;
  };
}
