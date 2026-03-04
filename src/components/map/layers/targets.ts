import mapboxgl from "mapbox-gl";
import type { Target } from "@/types/targets";

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

    load("enemy-drone", "/icons/red-drone.png");
    load("friendly-drone", "/icons/green-drone.png");
    load("unknown-drone", "/icons/unknown-drone.png");
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

  // NATO style rotating symbols (icon-rotate uses azimuth_deg) — greyed out when neutralized
  map.addLayer({
    id: "targets-symbols",
    type: "symbol",
    source: "targets",
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "classification"], "ENEMY"],
        "enemy-drone",
        ["==", ["get", "classification"], "FRIENDLY"],
        "friendly-drone",
        "unknown-drone",
      ],
      "icon-size": 0.3,
      "icon-rotate": ["get", "heading"],
      "icon-allow-overlap": true,
    },
    paint: {
      "icon-opacity": ["case", ["==", ["get", "neutralized"], true], 0.35, 1],
    },
  });
}

/** Update target layer data when targets change (e.g. reclassification) */
export function updateTargetLayersData(
  map: mapboxgl.Map,
  targets: TargetWithNeutralized[],
): void {
  const targetsSource = map.getSource("targets") as mapboxgl.GeoJSONSource;
  if (targetsSource) targetsSource.setData(targetsToGeoJSON(targets));
}
