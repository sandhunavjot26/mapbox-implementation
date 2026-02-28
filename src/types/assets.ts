/**
 * Asset types — formerly in mock/assets.ts.
 * Represents a device/tower for the UI layer (display model).
 * API devices are mapped to this shape by MissionWorkspace and mapFeatures utils.
 */

export type AssetStatus = "ACTIVE" | "INACTIVE";

export interface Asset {
  id: string;
  name: string;
  status: AssetStatus;
  altitude: number; // feet
  area: string;
  coordinates: [number, number]; // [lng, lat]
  coverageRadiusKm: number;
}
