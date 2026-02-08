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

export const MOCK_ASSETS: Asset[] = [
  {
    id: "asset-001",
    name: "Airshield-001",
    status: "ACTIVE",
    altitude: 500,
    area: "Samba",
    coordinates: [75.1072, 32.5574],
    coverageRadiusKm: 15,
  },
  {
    id: "asset-002",
    name: "Airshield-002",
    status: "ACTIVE",
    altitude: 500,
    area: "Samba",
    coordinates: [75.2134, 32.4821],
    coverageRadiusKm: 12,
  },
  {
    id: "asset-003",
    name: "Airshield-003",
    status: "INACTIVE",
    altitude: 500,
    area: "Jammu",
    coordinates: [74.8573, 32.7266],
    coverageRadiusKm: 18,
  },
  {
    id: "asset-004",
    name: "Airshield-004",
    status: "ACTIVE",
    altitude: 500,
    area: "Kathua",
    coordinates: [75.5194, 32.3868],
    coverageRadiusKm: 14,
  },
  {
    id: "asset-005",
    name: "Airshield-005",
    status: "ACTIVE",
    altitude: 500,
    area: "Pathankot",
    coordinates: [75.6421, 32.2747],
    coverageRadiusKm: 16,
  },
];
