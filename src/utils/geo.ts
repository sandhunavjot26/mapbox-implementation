const EARTH_RADIUS_KM = 6371;

/** Compute destination point from start, bearing (deg), and distance (km) */
export function destinationPoint(
  [lng, lat]: [number, number],
  bearingDeg: number,
  distanceKm: number
): [number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const d = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(bearingRad)
  );

  const lng2 =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
    );

  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}
