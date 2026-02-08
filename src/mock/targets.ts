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
}

export const MOCK_TARGETS: Target[] = [
  {
    id: "drone-001",
    classification: "ENEMY",
    distanceKm: 11.2,
    altitude: 500,
    frequencyMHz: 2400,
    rssi: -56.6,
    heading: 245,
    coordinates: [75.0312, 32.6142],
  },
  {
    id: "drone-002",
    classification: "ENEMY",
    distanceKm: 3.8,
    altitude: 350,
    frequencyMHz: 5800,
    rssi: -48.2,
    heading: 178,
    coordinates: [75.1847, 32.5023],
  },
  {
    id: "drone-003",
    classification: "UNKNOWN",
    distanceKm: 8.4,
    altitude: 600,
    frequencyMHz: 915,
    rssi: -62.1,
    heading: 312,
    coordinates: [74.9256, 32.7891],
  },
  {
    id: "drone-004",
    classification: "FRIENDLY",
    distanceKm: 2.1,
    altitude: 400,
    frequencyMHz: 2400,
    rssi: -41.5,
    heading: 90,
    coordinates: [75.3421, 32.4156],
  },
  {
    id: "drone-005",
    classification: "ENEMY",
    distanceKm: 15.7,
    altitude: 750,
    frequencyMHz: 433,
    rssi: -71.3,
    heading: 156,
    coordinates: [74.7834, 32.8234],
  },
  {
    id: "drone-006",
    classification: "UNKNOWN",
    distanceKm: 6.3,
    altitude: 280,
    frequencyMHz: 5800,
    rssi: -53.8,
    heading: 267,
    coordinates: [75.4512, 32.3089],
  },
];
