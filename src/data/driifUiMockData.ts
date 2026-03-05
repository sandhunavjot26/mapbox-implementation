/**
 * Hardcoded map features for Driif-UI demo page.
 * Rajasthan region — devices (towers), zones, and targets (drones). No API calls.
 */

import type { Target } from "@/types/targets";
import type { MissionLoad, Device, Zone } from "@/types/aeroshield";

/** Rajasthan region — approximate center */
const RAJASTHAN_CENTER: [number, number] = [74.0, 26.5];

/**
 * Bounds encompassing all mock data (devices, zones, targets).
 * Use with map.fitBounds() so all zones are visible.
 * Format: [[swLng, swLat], [neLng, neLat]]
 */
export const DRIIF_UI_BOUNDS: [[number, number], [number, number]] = [
  [72.9, 24.9],   // SW — padded to include southern zones (Kumbhalgarh ~25.15)
  [75.2, 28.2],   // NE — padded to include northern devices (dev-4 ~28.02) and tgt-9 (~27.95)
];

/** Hardcoded devices (towers) for coverage circles — Rajasthan. Exported for Assets panel. */
export const MOCK_DEVICES = [
  {
    id: "dev-1",
    serial_number: "DT-001",
    latitude: 26.45,
    longitude: 74.64,
    detection_radius_m: 3500,
    status: "ONLINE" as const,
  },
  {
    id: "dev-2",
    serial_number: "DT-002",
    latitude: 27.20,
    longitude: 73.73,
    detection_radius_m: 3000,
    status: "ONLINE" as const,
  },
  {
    id: "dev-3",
    serial_number: "DT-003",
    latitude: 26.10,
    longitude: 74.00,
    detection_radius_m: 2800,
    status: "WORKING" as const,
  },
  {
    id: "dev-4",
    serial_number: "DT-004",
    latitude: 28.02,
    longitude: 73.07,
    detection_radius_m: 2500,
    status: "ONLINE" as const,
  },
];

/** Create circular zone polygon */
function createCircleRing(
  center: [number, number],
  radiusDeg: number,
): [number, number][] {
  const [lng, lat] = center;
  const points: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const angle = (i / 16) * 2 * Math.PI;
    points.push([
      lng + radiusDeg * Math.cos(angle),
      lat + radiusDeg * Math.sin(angle),
    ]);
  }
  return points;
}

/** Create square zone polygon (axis-aligned) */
function createSquareRing(
  center: [number, number],
  halfSideDeg: number,
): [number, number][] {
  const [lng, lat] = center;
  return [
    [lng - halfSideDeg, lat - halfSideDeg],
    [lng + halfSideDeg, lat - halfSideDeg],
    [lng + halfSideDeg, lat + halfSideDeg],
    [lng - halfSideDeg, lat + halfSideDeg],
    [lng - halfSideDeg, lat - halfSideDeg],
  ];
}

/** Create triangular zone polygon */
function createTriangleRing(
  center: [number, number],
  sizeDeg: number,
): [number, number][] {
  const [lng, lat] = center;
  return [
    [lng, lat + sizeDeg],
    [lng - sizeDeg * 0.9, lat - sizeDeg * 0.7],
    [lng + sizeDeg * 0.9, lat - sizeDeg * 0.7],
    [lng, lat + sizeDeg],
  ];
}

/** Zone definitions — Rajasthan (priority: 1=red, 2=amber, 3=green, 4=purple, 5=pink, 6=yellow) */
const MOCK_ZONES: Array<{
  id: string;
  label: string;
  priority: number;
  shape: "circle" | "square" | "triangle";
  center: [number, number];
  sizeDeg: number;
}> = [
  { id: "zone-1", label: "Pali", priority: 3, shape: "circle", center: [73.32, 25.77], sizeDeg: 0.12 },
  { id: "zone-2", label: "Nagaur-Ajmer", priority: 3, shape: "circle", center: [73.9, 26.8], sizeDeg: 0.15 },
  { id: "zone-3", label: "Nagaur-Makrana", priority: 3, shape: "square", center: [74.2, 27.0], sizeDeg: 0.08 },
  { id: "zone-4", label: "Beawar", priority: 4, shape: "circle", center: [74.00, 26.10], sizeDeg: 0.10 },
  { id: "zone-5", label: "Ajmer-Jaipur", priority: 5, shape: "triangle", center: [74.8, 26.7], sizeDeg: 0.18 },
  { id: "zone-6", label: "Kumbhalgarh-Red", priority: 1, shape: "circle", center: [73.58, 25.15], sizeDeg: 0.06 },
  { id: "zone-7", label: "Kumbhalgarh-Yellow", priority: 6, shape: "circle", center: [73.62, 25.18], sizeDeg: 0.05 },
];

/** Hardcoded targets (drones) — Rajasthan, placed in/near zones */
export const MOCK_TARGETS: Target[] = [
  { id: "tgt-1", classification: "UNKNOWN", coordinates: [73.85, 26.75], distanceKm: 2.1, altitude: 450, frequencyMHz: 2.4, rssi: -65, heading: 45 },
  { id: "tgt-2", classification: "UNKNOWN", coordinates: [73.92, 26.82], distanceKm: 1.8, altitude: 320, frequencyMHz: 2.4, rssi: -72, heading: 120 },
  { id: "tgt-3", classification: "ENEMY", coordinates: [73.78, 26.88], distanceKm: 3.2, altitude: 580, frequencyMHz: 5.8, rssi: -58, heading: 270 },
  { id: "tgt-4", classification: "UNKNOWN", coordinates: [74.15, 26.95], distanceKm: 2.5, altitude: 210, frequencyMHz: 2.4, rssi: -78, heading: 90 },
  { id: "tgt-5", classification: "FRIENDLY", coordinates: [74.70, 26.65], distanceKm: 1.2, altitude: 150, frequencyMHz: 2.4, rssi: -55, heading: 180 },
  { id: "tgt-6", classification: "UNKNOWN", coordinates: [74.00, 26.12], distanceKm: 0.8, altitude: 90, frequencyMHz: 2.4, rssi: -62, heading: 0 },
  { id: "tgt-7", classification: "UNKNOWN", coordinates: [73.35, 25.80], distanceKm: 1.5, altitude: 380, frequencyMHz: 5.8, rssi: -70, heading: 315 },
  { id: "tgt-8", classification: "UNKNOWN", coordinates: [73.60, 25.20], distanceKm: 2.0, altitude: 420, frequencyMHz: 2.4, rssi: -68, heading: 225 },
  { id: "tgt-9", classification: "UNKNOWN", coordinates: [73.05, 27.95], distanceKm: 4.1, altitude: 510, frequencyMHz: 5.8, rssi: -75, heading: 135 },
  { id: "tgt-10", classification: "UNKNOWN", coordinates: [73.72, 26.85], distanceKm: 1.1, altitude: 180, frequencyMHz: 2.4, rssi: -60, heading: 45 },
  { id: "tgt-11", classification: "UNKNOWN", coordinates: [73.68, 26.82], distanceKm: 1.3, altitude: 200, frequencyMHz: 2.4, rssi: -63, heading: 90 },
];

/** Build map features GeoJSON for MapContainer */
/**
 * Build a MissionLoad for the mission store so MapContainer's cinematic intro
 * flies to Rajasthan (our mock devices) instead of Jammu (DEFAULT_FLY_CENTER).
 * Call setCachedMission(getDriifUiCachedMission()) on driif-ui mount.
 */
export function getDriifUiCachedMission(): MissionLoad {
  const devices: Device[] = MOCK_DEVICES.map((d) => ({
    id: d.id,
    name: d.serial_number,
    serial_number: d.serial_number,
    mission_id: "driif-demo",
    device_type: "DETECTION" as const,
    color: null,
    latitude: d.latitude,
    longitude: d.longitude,
    status: d.status,
    detection_radius_m: d.detection_radius_m,
    jammer_radius_m: null,
  }));

  const zones: Zone[] = MOCK_ZONES.map((z) => {
    let ring: [number, number][];
    if (z.shape === "circle") {
      ring = createCircleRing(z.center, z.sizeDeg);
    } else if (z.shape === "square") {
      ring = createSquareRing(z.center, z.sizeDeg);
    } else {
      ring = createTriangleRing(z.center, z.sizeDeg);
    }
    const first = ring[0];
    if (first && (ring.length < 2 || ring[ring.length - 1]?.[0] !== first[0])) {
      ring.push([...first]);
    }
    return {
      id: z.id,
      label: z.label,
      priority: z.priority,
      zone_geojson: { type: "Polygon" as const, coordinates: [ring] },
      action_plan: {},
    };
  });

  return {
    id: "driif-demo",
    name: "Driif UI Demo",
    aop: null,
    border_geojson: null,
    zones,
    features: [],
    devices,
  };
}

/** Build map features GeoJSON for MapContainer */
export function getDriifUiMapFeatures(): GeoJSON.FeatureCollection {
  const deviceFeatures: GeoJSON.Feature[] = MOCK_DEVICES.map((d) => ({
    type: "Feature",
    properties: {
      type: "device",
      id: d.id,
      serial_number: d.serial_number,
      detection_radius_m: d.detection_radius_m,
      status: d.status,
    },
    geometry: {
      type: "Point",
      coordinates: [d.longitude, d.latitude],
    },
  }));

  const zoneFeatures: GeoJSON.Feature[] = MOCK_ZONES.map((z) => {
    let ring: [number, number][];
    if (z.shape === "circle") {
      ring = createCircleRing(z.center, z.sizeDeg);
    } else if (z.shape === "square") {
      ring = createSquareRing(z.center, z.sizeDeg);
    } else {
      ring = createTriangleRing(z.center, z.sizeDeg);
    }
    const first = ring[0];
    if (first && (ring.length < 2 || ring[ring.length - 1]?.[0] !== first[0])) {
      ring.push([...first]);
    }
    return {
      type: "Feature",
      properties: {
        type: "zone",
        id: z.id,
        label: z.label,
        priority: z.priority,
      },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    };
  });

  return {
    type: "FeatureCollection",
    features: [...deviceFeatures, ...zoneFeatures],
  };
}

export { RAJASTHAN_CENTER };

/** Mock missions for Missions overlay (Figma node 235:3799) */
export type MissionStatus = "STAGED" | "LAUNCHED" | "ACTIVE" | "COMPLETED";

export interface MockMission {
  id: string;
  name: string;
  createdAt: string; // e.g. "24 Jan 2025"
  status: MissionStatus;
}

export const MOCK_MISSIONS: MockMission[] = [
  { id: "m1", name: "Mission Name", createdAt: "24 Jan 2025", status: "STAGED" },
  { id: "m2", name: "Mission Alpha", createdAt: "15 Feb 2025", status: "LAUNCHED" },
  { id: "m3", name: "Mission Beta", createdAt: "30 Mar 2025", status: "ACTIVE" },
  { id: "m4", name: "Mission Gamma", createdAt: "10 Apr 2025", status: "COMPLETED" },
];

/** Fences for Create Mission form — from MOCK_ZONES (Figma node 259:1746) */
const ZONE_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F59E0B",
  3: "#16D969",
  4: "#9043F9",
  5: "#FF30C6",
  6: "#E2FF00",
};

export const MOCK_CREATE_FENCES = MOCK_ZONES.slice(0, 3).map((z) => ({
  id: z.id,
  label: z.label,
  color: ZONE_COLORS[z.priority] ?? "#8a8a8a",
}));

/** Assets for Create Mission form — Aakash Drone style (Figma node 259:1767) */
export const MOCK_CREATE_ASSETS = MOCK_DEVICES.slice(0, 3).map((d, i) => ({
  id: d.id,
  name: "Aakash Drone",
  assetId: `#0${1928 + i}`,
  battery: [74, 68, 81][i] ?? 74,
  coords: `${d.longitude.toFixed(6)},${d.latitude.toFixed(6)}`,
}));

/** Assets for Select Asset screen (Figma node 235:5039) — with payload and GNSS */
export const MOCK_SELECT_ASSETS = [
  { id: "sel-1", name: "Aakash Drone", assetId: "#01928", battery: 74, coords: "80.571918,96.571918", payload: "EOS, IR", gnssValid: true },
  { id: "sel-2", name: "Breeze UAV", assetId: "#D24710", battery: 85, coords: "77.123456,98.654321", payload: "RGB, LiDAR", gnssValid: false },
  { id: "sel-3", name: "SkyWatcher", assetId: "#3B8C57", battery: 90, coords: "80.987654,92.345678", payload: "Thermal, Multispectral", gnssValid: true },
  { id: "sel-4", name: "Falcon X1", assetId: "#F9C74F", battery: 78, coords: "76.543210,97.123456", payload: "HD Camera, Sonar", gnssValid: true },
];
