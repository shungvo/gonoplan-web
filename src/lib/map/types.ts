/**
 * Provider-neutral map domain types.
 *
 * Nothing outside `lib/map/adapters` may name Goong, MapLibre or any other
 * vendor. That is what makes docs/03-platform.md §1's "swap the provider later"
 * an actual property of the code rather than an aspiration.
 */

export interface LngLat {
  longitude: number;
  latitude: number;
}

export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapViewport {
  center: LngLat;
  zoom: number;
  bounds: MapBounds;
}

/** The lean marker shape from `GET /places/map` — see docs/02-api.md §4. */
export interface PlaceMarker {
  id: string;
  latitude: number;
  longitude: number;
  categoryId: string;
  priceRange: string | null;
  bayesianRating: number;
}

export interface MapStyleSource {
  /** Style JSON URL handed to the renderer. */
  styleUrl: string;
  /** Shown in the corner. Tile providers require this; it is not optional. */
  attribution: string;
  /**
   * True on the keyless community basemap — whether the build chose it or fell
   * back to it. It describes the tiles, not how the decision was reached.
   */
  isFallback: boolean;
  providerName: string;
}

/**
 * Resolves which basemap to render.
 *
 * Deliberately the *only* provider-specific surface in the client. Everything
 * metered — geocoding, routing, place search — goes through the Express proxy
 * instead, because the REST key must never reach a browser
 * (docs/03-platform.md §1).
 */
export interface MapStyleProvider {
  readonly name: string;
  isConfigured(): boolean;
  getStyle(): MapStyleSource;
}
