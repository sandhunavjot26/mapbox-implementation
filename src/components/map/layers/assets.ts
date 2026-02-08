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
  // Check if source already exists
  if (map.getSource("assets")) return;

  // Add GeoJSON source with promoteId for feature-state support
  map.addSource("assets", {
    type: "geojson",
    data: assetsToGeoJSON(MOCK_ASSETS),
    promoteId: "id", // Required for setFeatureState
  });

  // Layer 1: Coverage area (radar-style circles)
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
        "#22c55e", // green-500
        "#64748b", // slate-500
      ],
      // Increased opacity when selected
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.35, // selected
        0.15, // default
      ],
      // Increased stroke width when selected
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        2, // selected
        1, // default
      ],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e",
        "#64748b",
      ],
      // Increased stroke opacity when selected
      "circle-stroke-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.8, // selected
        0.4, // default
      ],
    },
  });

  // Layer 2: Sensor point markers
  map.addLayer({
    id: "assets-points",
    type: "circle",
    source: "assets",
    paint: {
      // Larger radius when selected
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        8, // selected
        6, // default
      ],
      "circle-color": [
        "case",
        ["==", ["get", "status"], "ACTIVE"],
        "#22c55e", // green-500
        "#64748b", // slate-500
      ],
      // Thicker stroke when selected
      "circle-stroke-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        3, // selected
        2, // default
      ],
      "circle-stroke-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#ffffff", // selected - white border
        "#0a0a0a", // default - dark border
      ],
    },
  });

  console.log("Asset layers added to map");
}
