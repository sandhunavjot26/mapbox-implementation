/**
 * Client-side check: mission border (first fence) vertices lie inside the site polygon
 * (exterior + holes), per API_GUIDE expectation that the mission border is within the site.
 */

function pointInRing(pt: [number, number], ring: GeoJSON.Position[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj || pi.length < 2 || pj.length < 2) continue;
    const xi = pi[0]!;
    const yi = pi[1]!;
    const xj = pj[0]!;
    const yj = pj[1]!;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(pt: [number, number], poly: GeoJSON.Polygon): boolean {
  const rings = poly.coordinates;
  if (!rings.length) return false;
  const exterior = rings[0];
  if (!exterior?.length || !pointInRing(pt, exterior)) return false;
  for (let h = 1; h < rings.length; h++) {
    const hole = rings[h];
    if (hole?.length && pointInRing(pt, hole)) return false;
  }
  return true;
}

/** True if every vertex of the mission border’s outer ring is inside `siteBorder` (including hole handling). */
export function isMissionBorderInsideSite(
  missionBorder: GeoJSON.Polygon,
  siteBorder: GeoJSON.Polygon
): boolean {
  const outer = missionBorder.coordinates[0];
  if (!outer?.length) return false;
  for (const pos of outer) {
    if (pos.length < 2) continue;
    const pt: [number, number] = [pos[0]!, pos[1]!];
    if (!pointInPolygon(pt, siteBorder)) return false;
  }
  return true;
}
