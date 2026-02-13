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
  if (map.getSource("targets")) return;

  map.addSource("targets", {
    type: "geojson",
    data: targetsToGeoJSON(MOCK_TARGETS),
    promoteId: "id",
  });

  // Layer 1: Glow
  map.addLayer({
    id: "targets-glow",
    type: "circle",
    source: "targets",
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        20,
        12,
      ],
      "circle-color": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444",
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e",
        "#f59e0b",
      ],
      "circle-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.6,
        0.3,
      ],
      "circle-blur": 0.5,
    },
  });

  // Layer 2: Target points
  map.addLayer({
    id: "targets-points",
    type: "circle",
    source: "targets",
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        9,
        7,
      ],
      "circle-color": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444",
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e",
        "#f59e0b",
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

  // Layer 3: Center dot
  map.addLayer({
    id: "targets-center",
    type: "circle",
    source: "targets",
    paint: {
      "circle-radius": 2,
      "circle-color": "#ffffff",
    },
  });
}
