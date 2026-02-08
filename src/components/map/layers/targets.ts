import mapboxgl from "mapbox-gl";
import { MOCK_TARGETS, Target } from "@/mock/targets";

// Convert targets to GeoJSON FeatureCollection
function targetsToGeoJSON(targets: Target[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: targets.map((target) => ({
      type: "Feature" as const,
      properties: {
        id: target.id,
        classification: target.classification,
        distanceKm: target.distanceKm,
        altitude: target.altitude,
        frequencyMHz: target.frequencyMHz,
        rssi: target.rssi,
        heading: target.heading,
      },
      geometry: {
        type: "Point" as const,
        coordinates: target.coordinates,
      },
    })),
  };
}

// Add target layers to map
export function addTargetLayers(map: mapboxgl.Map) {
  // Check if source already exists
  if (map.getSource("targets")) return;

  // Add GeoJSON source with promoteId for feature-state support
  map.addSource("targets", {
    type: "geojson",
    data: targetsToGeoJSON(MOCK_TARGETS),
    promoteId: "id", // Required for setFeatureState
  });

  // Layer 1: Target outer glow/pulse effect
  map.addLayer({
    id: "targets-glow",
    type: "circle",
    source: "targets",
    paint: {
      // Larger glow radius when selected
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        20, // selected
        12, // default
      ],
      "circle-color": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444", // red-500
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e", // green-500
        "#f59e0b", // amber-500 (UNKNOWN)
      ],
      // Increased opacity when selected
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.6, // selected
        0.3, // default
      ],
      "circle-blur": 0.5,
    },
  });

  // Layer 2: Target point markers
  map.addLayer({
    id: "targets-points",
    type: "circle",
    source: "targets",
    paint: {
      // Larger radius when selected
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        9, // selected
        7, // default
      ],
      "circle-color": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444", // red-500
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e", // green-500
        "#f59e0b", // amber-500 (UNKNOWN)
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

  // Layer 3: Inner dot for target center
  map.addLayer({
    id: "targets-center",
    type: "circle",
    source: "targets",
    paint: {
      "circle-radius": 2,
      "circle-color": "#ffffff",
    },
  });

  console.log("Target layers added to map");
}
