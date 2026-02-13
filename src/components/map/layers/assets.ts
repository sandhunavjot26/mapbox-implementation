import mapboxgl from "mapbox-gl";
import { MOCK_ASSETS, Asset } from "@/mock/assets";

// Convert assets to GeoJSON FeatureCollection
function assetsToGeoJSON(assets: Asset[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: assets.map((asset) => ({
      type: "Feature" as const,
      properties: {
        id: asset.id,
        name: asset.name,
        status: asset.status,
        altitude: asset.altitude,
        area: asset.area,
        coverageRadiusKm: asset.coverageRadiusKm,
      },
      geometry: {
        type: "Point" as const,
        coordinates: asset.coordinates,
      },
    })),
  };
}

// Add asset layers to map
export function addAssetLayers(map: mapboxgl.Map) {
  if (map.getSource("assets")) return;

  map.addSource("assets", {
    type: "geojson",
    data: assetsToGeoJSON(MOCK_ASSETS),
    promoteId: "id",
  });

  // Layer 1: Coverage area (radar-style circles) — green if ACTIVE, grey if INACTIVE
  map.addLayer({
    id: "assets-coverage",
    type: "circle",
    source: "assets",
    paint: {
      "circle-radius": [
        "interpolate",
        ["exponential", 2],
        ["zoom"],
        5, ["*", ["get", "coverageRadiusKm"], 0.3],
        10, ["*", ["get", "coverageRadiusKm"], 3],
        15, ["*", ["get", "coverageRadiusKm"], 100],
        20, ["*", ["get", "coverageRadiusKm"], 3000],
      ],
      "circle-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e",
        "#64748b",
      ],
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.35,
        0.15,
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        2,
        1,
      ],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e",
        "#64748b",
      ],
      "circle-stroke-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.8,
        0.4,
      ],
    },
  });

  // Layer 2: Sensor point markers
  map.addLayer({
    id: "assets-points",
    type: "circle",
    source: "assets",
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        8,
        6,
      ],
      "circle-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e",
        "#64748b",
      ],
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        3,
        2,
      ],
      "circle-stroke-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#ffffff",
        "#0a0a0a",
      ],
    },
  });
}
