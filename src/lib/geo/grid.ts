const METERS_PER_DEGREE_LATITUDE = 111_320;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Snaps a coordinate to a fixed grid so nearby queries share a cache entry.
 *
 * A phone's GPS drifts by a few metres while standing still, so raw
 * coordinates produce a different query key on every reading — every one a
 * cache miss, and a fresh spatial query for results that are identical.
 * Rounding the *query centre* to a ~200 m grid makes those collide on purpose.
 *
 * This affects only the cache key. The user's real position is still used for
 * displaying distances and centring the map.
 *
 * Known limit: two points a few metres apart can straddle a cell boundary and
 * still produce different keys. That is inherent to any fixed grid, and it
 * costs one extra fetch — never a wrong result.
 */
export function snapToGrid(
  { latitude, longitude }: Coordinates,
  gridMeters = 200,
): Coordinates {
  const latitudeStep = gridMeters / METERS_PER_DEGREE_LATITUDE;
  const snappedLatitude = round6(Math.round(latitude / latitudeStep) * latitudeStep);

  // A degree of longitude narrows towards the poles, so the longitude step
  // depends on latitude — and it must be derived from the *snapped* latitude,
  // not the raw one. Using the raw value gives two points in the same grid row
  // slightly different longitude steps, which lands them in different cells
  // and defeats the whole purpose. It also makes the function non-idempotent.
  // The floor keeps the divisor sane near ±90°, where cos() approaches zero.
  const longitudeScale = Math.max(Math.cos((snappedLatitude * Math.PI) / 180), 0.01);
  const longitudeStep = gridMeters / (METERS_PER_DEGREE_LATITUDE * longitudeScale);

  return {
    latitude: snappedLatitude,
    longitude: round6(Math.round(longitude / longitudeStep) * longitudeStep),
  };
}

/** Six decimals ≈ 0.1 m — far below the grid size, and keeps keys stable. */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Great-circle distance in metres.
 *
 * Client-side only, for re-labelling a card as the user moves. Ranking and
 * filtering by distance happen in PostGIS, where the index lives.
 */
export function haversineMeters(from: Coordinates, to: Coordinates): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)));
}

/** "450 m" / "1.2 km" — distance the way a person would say it. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${String(Math.round(meters / 10) * 10)} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${String(Math.round(meters / 1000))} km`;
}
