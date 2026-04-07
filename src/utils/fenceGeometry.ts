export type Coordinate = [number, number];

export const FENCE_MODE_COLORS = {
  polygon: { fill: "#FF30C6", fillOpacity: 0.18, outline: "#FF30C6" },
  square: { fill: "#9E5CFF", fillOpacity: 0.18, outline: "#9E5CFF" },
  circle: { fill: "#00D68F", fillOpacity: 0.18, outline: "#00D68F" },
} as const;

export type FenceModeColorSet = {
  fill: string;
  fillOpacity: number;
  outline: string;
};

export function closeRing(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return [];
  const [firstLng, firstLat] = points[0];
  const last = points[points.length - 1];
  if (last[0] === firstLng && last[1] === firstLat) return points;
  return [...points, [firstLng, firstLat]];
}

export function buildPolygonFeature(
  points: Coordinate[],
  colors?: FenceModeColorSet,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: colors
      ? {
          fillColor: colors.fill,
          fillOpacity: colors.fillOpacity,
          outlineColor: colors.outline,
        }
      : {},
    geometry: {
      type: "Polygon",
      coordinates: [closeRing(points)],
    },
  };
}

export function buildRectanglePoints(
  start: Coordinate,
  end: Coordinate,
): Coordinate[] {
  const minLng = Math.min(start[0], end[0]);
  const maxLng = Math.max(start[0], end[0]);
  const minLat = Math.min(start[1], end[1]);
  const maxLat = Math.max(start[1], end[1]);

  return [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat],
  ];
}

/**
 * Haversine distance between two [lng, lat] coordinates in metres.
 * Used for circle radius calculation on the map.
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinHalfLon * sinHalfLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Generate a point at a given distance and bearing from a center.
 * Uses destination-point formula for geographic accuracy.
 */
function destinationPoint(
  center: Coordinate,
  distanceM: number,
  bearingDeg: number,
): Coordinate {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(center[1]);
  const lon1 = toRad(center[0]);
  const brng = toRad(bearingDeg);
  const d = distanceM / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [toDeg(lon2), toDeg(lat2)];
}

export function buildCirclePoints(
  center: Coordinate,
  edge: Coordinate,
  steps = 64,
): Coordinate[] {
  const radius = haversineDistance(center, edge);
  return Array.from({ length: steps }, (_, i) => {
    const bearing = (i / steps) * 360;
    return destinationPoint(center, radius, bearing);
  });
}

export function isSameCoordinate(
  a: Coordinate | null,
  b: Coordinate | null,
): boolean {
  if (!a || !b) return a === b;
  return a[0] === b[0] && a[1] === b[1];
}

export function getPolygonCentroid(ring: Coordinate[]): Coordinate {
  const uniquePoints = ring.slice(0, -1);
  if (uniquePoints.length === 0) return [0, 0];

  const sum = uniquePoints.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]] as Coordinate,
    [0, 0] as Coordinate,
  );

  return [sum[0] / uniquePoints.length, sum[1] / uniquePoints.length];
}
