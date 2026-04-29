import mapboxgl from "mapbox-gl";
import type { Target } from "@/types/targets";

/** Same slot / treatment as asset radar overlays — visible on Standard night + monochrome */
const TARGET_OVERLAY_SLOT = "top" as const;

/** Set to `true` to render and update position-history trail lines behind drone symbols. */
const SHOW_DRONE_TRAILS = false;

type TargetWithNeutralized = Target & { neutralized?: boolean };

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
        lost: target.lost ?? false,
      },
      geometry: {
        type: "Point" as const,
        coordinates: target.coordinates,
      },
    })),
  };
}

function trailsToGeoJSON(
  positionHistory: Record<string, [number, number][]>,
  targets: TargetWithNeutralized[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (const target of targets) {
    if (target.lost) continue;
    const trail = positionHistory[target.id];
    if (!trail || trail.length < 2) continue;
    features.push({
      type: "Feature",
      properties: {
        targetId: target.id,
        classification: target.classification,
      },
      geometry: { type: "LineString", coordinates: trail },
    });
  }
  return { type: "FeatureCollection", features };
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

    load("enemy-drone", "/icons/red-drone.png");
    load("friendly-drone", "/icons/green-drone.png");
    load("unknown-drone", "/icons/unknown-drone.png");
  });
}

export async function addTargetLayers(
  map: mapboxgl.Map,
  targets: TargetWithNeutralized[],
  positionHistory?: Record<string, [number, number][]>,
): Promise<void> {
  if (map.getSource("targets")) return;

  await loadTargetIcons(map);

  map.addSource("targets", {
    type: "geojson",
    data: targetsToGeoJSON(targets),
    promoteId: "id",
  });

  if (SHOW_DRONE_TRAILS) {
    const trails = positionHistory ?? {};
    map.addSource("target-trails", {
      type: "geojson",
      data: trailsToGeoJSON(trails, targets),
    });
    map.addLayer({
      id: "target-trails-line",
      type: "line",
      source: "target-trails",
      slot: TARGET_OVERLAY_SLOT,
      paint: {
        "line-color": [
          "match",
          ["get", "classification"],
          "ENEMY",
          "#f87171",
          "FRIENDLY",
          "#4ade80",
          "#facc15",
        ],
        "line-width": 2.5,
        "line-opacity": 0.95,
        "line-emissive-strength": 1,
        "line-color-use-theme": "disabled",
      },
    });
  }

  // NATO style rotating symbols — greyed when neutralized or lost
  map.addLayer({
    id: "targets-symbols",
    type: "symbol",
    source: "targets",
    slot: TARGET_OVERLAY_SLOT,
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "enemy-drone",
        ["==", ["get", "classification"], "FRIENDLY"],
        "friendly-drone",
        "unknown-drone",
      ],
      "icon-size": 0.22,
      "icon-rotate": ["get", "heading"],
      "icon-allow-overlap": true,
    },
    paint: {
      "icon-opacity": [
        "case",
        ["==", ["get", "neutralized"], true],
        0.35,
        ["case", ["==", ["get", "lost"], true], 0.25, 1],
      ],
      "icon-emissive-strength": 1,
    },
  });
}

/** Update target layer data when targets or trails change */
export function updateTargetLayersData(
  map: mapboxgl.Map,
  targets: TargetWithNeutralized[],
  positionHistory?: Record<string, [number, number][]>,
): void {
  const targetsSource = map.getSource("targets") as mapboxgl.GeoJSONSource;
  if (targetsSource) targetsSource.setData(targetsToGeoJSON(targets));

  if (SHOW_DRONE_TRAILS) {
    const trailsSource = map.getSource(
      "target-trails",
    ) as mapboxgl.GeoJSONSource;
    if (trailsSource && positionHistory) {
      trailsSource.setData(trailsToGeoJSON(positionHistory, targets));
    }
  }
}
