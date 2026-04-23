/**
 * Transform API map features to layer-compatible GeoJSON.
 * API devices use detection_radius_m; assets layer expects coverageRadiusKm + radar Task 0 props.
 */

import type { MapFeatureCollection, Zone } from "@/types/aeroshield";
import { radarPropsFromMapFeatureProps } from "@/utils/radarAssetsGeoJSON";

/** Extract device features and add coverageRadiusKm for assets layer */
export function mapFeaturesToAssetsGeoJSON(
  fc: MapFeatureCollection | undefined,
): GeoJSON.FeatureCollection {
  if (!fc?.features) {
    return { type: "FeatureCollection", features: [] };
  }
  const deviceFeatures = fc.features.filter(
    (f) => f.properties?.type === "device",
  );
  const transformed = deviceFeatures.map((f) => {
    const props = f.properties ?? {};
    const detectionRadiusM = props.detection_radius_m as number | undefined;
    const coverageRadiusKm =
      detectionRadiusM != null ? detectionRadiusM / 1000 : 2;
    const status =
      props.status === "ONLINE" || props.status === "WORKING"
        ? "ACTIVE"
        : "INACTIVE";
    const radar = radarPropsFromMapFeatureProps(
      props as Record<string, unknown>,
      coverageRadiusKm,
      status,
    );
    return {
      ...f,
      properties: {
        ...radar,
        id: props.id,
        name: props.serial_number ?? props.id ?? "Device",
        type: "device",
      },
    };
  });
  return { type: "FeatureCollection", features: transformed };
}

/** Extract zone features for zones layer (from map features API) */
export function mapFeaturesToZonesGeoJSON(
  fc: MapFeatureCollection | undefined,
): GeoJSON.FeatureCollection {
  if (!fc?.features) {
    return { type: "FeatureCollection", features: [] };
  }
  const zoneFeatures = fc.features.filter((f) => f.properties?.type === "zone");
  return { type: "FeatureCollection", features: zoneFeatures };
}

/**
 * Convert Zone[] from mission load response to GeoJSON for zones layer.
 * This preserves the `priority` field for color-coded rendering.
 * Falls back to empty if no zones.
 */
export function missionZonesToGeoJSON(
  zones: Zone[] | undefined,
): GeoJSON.FeatureCollection {
  if (!zones?.length) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature" as const,
      properties: {
        id: zone.id,
        label: zone.label,
        priority: zone.priority,
        type: "zone",
      },
      geometry: zone.zone_geojson,
    })),
  };
}

/** Extract border feature (may be Feature or raw geometry) */
export function mapFeaturesToBorderGeoJSON(
  fc: MapFeatureCollection | undefined,
): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!fc?.features) return null;
  const border = fc.features.find(
    (f) => f.properties?.type === "mission_border",
  );
  if (!border) return null;
  const geom = (border as GeoJSON.Feature).geometry;
  if (!geom || geom.type !== "Polygon") return null;
  return {
    type: "Feature",
    geometry: geom,
    properties: border.properties ?? {},
  };
}
