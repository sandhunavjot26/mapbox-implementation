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
  color: string | null;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  detection_radius_m: number | null;
  jammer_radius_m: number | null;
  monitor_device_id?: number;
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
