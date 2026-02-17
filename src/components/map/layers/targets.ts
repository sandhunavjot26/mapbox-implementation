import mapboxgl from "mapbox-gl";
import { Target } from "@/mock/targets";
import { destinationPoint } from "@/utils/geo";

/**
 * Generates a smoother tactical wedge cone
 */
function generateThreatCone(target: Target, angle = 60): GeoJSON.Position[] {
  const { coordinates, heading, distanceKm } = target;

  // Tactical wedge: 1.5–3 km (was 5–12+ km, too large at map scale)
  const dynamicDistance = Math.min(3, Math.max(1.5, distanceKm * 0.1));

  const steps = 12; // smoother curve
  const halfAngle = angle / 2;
  const points: GeoJSON.Position[] = [coordinates];

  for (let i = 0; i <= steps; i++) {
    const bearing = heading - halfAngle + (i / steps) * angle;

    points.push(destinationPoint(coordinates, bearing, dynamicDistance));
  }

  points.push(coordinates);

  return points;
}

type TargetWithNeutralized = Target & { neutralized?: boolean };

function targetsToConeGeoJSON(
  targets: TargetWithNeutralized[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: targets.map((target) => ({
      type: "Feature" as const,
      properties: {
        id: target.id,
        classification: target.classification,
        neutralized: target.neutralized ?? false,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [generateThreatCone(target)],
      },
    })),
  };
}

const PREDICTED_PATH_KM = 4;

function targetsToPredictedPathGeoJSON(
  targets: TargetWithNeutralized[],
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: targets
      .filter((t) => !t.neutralized)
      .map((target) => {
        const end = destinationPoint(
          target.coordinates,
          target.heading,
          PREDICTED_PATH_KM,
        );
        return {
          type: "Feature" as const,
          properties: { id: target.id, classification: target.classification },
          geometry: {
            type: "LineString" as const,
            coordinates: [target.coordinates, end],
          },
        };
      }),
  };
}

function targetsToGeoJSON(
  targets: TargetWithNeutralized[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: targets.map((target) => ({
      type: "Feature" as const,
      properties: {
        id: target.id,
        classification: target.classification,
        heading: target.heading,
        neutralized: target.neutralized ?? false,
      },
      geometry: {
        type: "Point" as const,
        coordinates: target.coordinates,
      },
    })),
  };
}

function loadTargetIcons(map: mapboxgl.Map): Promise<void> {
  return new Promise((resolve) => {
    let pending = 3;
    const check = () => {
      if (--pending === 0) resolve();
    };

    const load = (name: string, path: string) => {
      if (!map.hasImage(name)) {
        map.loadImage(path, (err, image) => {
          if (!err && image) map.addImage(name, image);
          check();
        });
      } else {
        check();
      }
    };

    load("enemy-arrow", "/icons/red-arrow.png");
    load("friendly-arrow", "/icons/green-arrow.png");
    load("unknown-arrow", "/icons/unknown-arrow.png");
  });
}

export async function addTargetLayers(
  map: mapboxgl.Map,
  targets: TargetWithNeutralized[],
): Promise<void> {
  if (map.getSource("targets")) return;

  await loadTargetIcons(map);

  map.addSource("targets", {
    type: "geojson",
    data: targetsToGeoJSON(targets),
    promoteId: "id",
  });

  map.addSource("target-cones", {
    type: "geojson",
    data: targetsToConeGeoJSON(targets),
  });

  // Cones (fill) — greyed out when neutralized
  map.addLayer({
    id: "target-cones-layer",
    type: "fill",
    source: "target-cones",
    paint: {
      "fill-color": [
        "case",
        ["==", ["get", "neutralized"], true],
        "#64748b",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444",
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e",
        "#f59e0b",
      ],
      "fill-opacity": [
        "case",
        ["==", ["get", "neutralized"], true],
        0.12,
        0.25,
      ],
    },
  });

  // Cone outline — greyed out when neutralized
  map.addLayer({
    id: "target-cones-outline",
    type: "line",
    source: "target-cones",
    paint: {
      "line-color": [
        "case",
        ["==", ["get", "neutralized"], true],
        "#64748b",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444",
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e",
        "#f59e0b",
      ],
      "line-width": 2,
      "line-opacity": ["case", ["==", ["get", "neutralized"], true], 0.3, 0.6],
    },
  });

  // NATO style rotating symbols — greyed out when neutralized
  map.addLayer({
    id: "targets-symbols",
    type: "symbol",
    source: "targets",
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "enemy-arrow",
        ["==", ["get", "classification"], "FRIENDLY"],
        "friendly-arrow",
        "unknown-arrow",
      ],
      "icon-size": 0.6,
      "icon-rotate": ["get", "heading"],
      "icon-allow-overlap": true,
    },
    paint: {
      "icon-opacity": ["case", ["==", ["get", "neutralized"], true], 0.35, 1],
    },
  });

  // Predicted path (line along heading)
  map.addSource("target-predicted-paths", {
    type: "geojson",
    data: targetsToPredictedPathGeoJSON(targets),
  });
  map.addLayer({
    id: "target-predicted-paths-layer",
    type: "line",
    source: "target-predicted-paths",
    paint: {
      "line-color": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "#ef4444",
        ["==", ["get", "classification"], "FRIENDLY"],
        "#22c55e",
        "#f59e0b",
      ],
      "line-width": 1.5,
      "line-opacity": 0.6,
      "line-dasharray": [1, 1],
    },
  });

  // White center dot — greyed out when neutralized
  map.addLayer({
    id: "targets-center",
    type: "circle",
    source: "targets",
    paint: {
      "circle-radius": 3,
      "circle-color": [
        "case",
        ["==", ["get", "neutralized"], true],
        "#94a3b8",
        "#ffffff",
      ],
      "circle-opacity": ["case", ["==", ["get", "neutralized"], true], 0.5, 1],
    },
  });
}

/** Update target layer data when targets change (e.g. reclassification) */
export function updateTargetLayersData(
  map: mapboxgl.Map,
  targets: TargetWithNeutralized[],
): void {
  const targetsSource = map.getSource("targets") as mapboxgl.GeoJSONSource;
  const conesSource = map.getSource("target-cones") as mapboxgl.GeoJSONSource;
  const pathsSource = map.getSource(
    "target-predicted-paths",
  ) as mapboxgl.GeoJSONSource;
  if (targetsSource) targetsSource.setData(targetsToGeoJSON(targets));
  if (conesSource) conesSource.setData(targetsToConeGeoJSON(targets));
  if (pathsSource) pathsSource.setData(targetsToPredictedPathGeoJSON(targets));
}
