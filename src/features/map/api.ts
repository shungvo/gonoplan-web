import { api } from '@/lib/api/client';
import type { MapBounds, PlaceMarker } from '@/lib/map/types';

export interface MarkerPage {
  markers: PlaceMarker[];
  /** True when the viewport held more places than the server returned. */
  capped: boolean;
}

/**
 * Fetches markers for the current viewport.
 *
 * Deliberately the lean DTO, not full place cards: a viewport can hold hundreds
 * of markers whose detail nobody can read at that zoom, so shipping cards would
 * be roughly thirty times the payload for invisible data. The card is fetched
 * when a marker is tapped (docs/02-api.md §4).
 */
export async function fetchMapMarkers(
  bounds: MapBounds,
  options: { categorySlugs?: string[]; limit?: number } = {},
): Promise<MarkerPage> {
  const bbox = [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat]
    // Six decimals is ~10 cm — far finer than any viewport, and it keeps the
    // query string (and therefore the cache key) stable across sub-pixel pans.
    .map((value) => value.toFixed(6))
    .join(',');

  const result = await api.getWithMeta<PlaceMarker[]>('/places/map', {
    withAuth: false,
    query: {
      bbox,
      ...(options.categorySlugs?.length ? { category: options.categorySlugs.join(',') } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    },
  });

  return {
    markers: result.data,
    capped: (result.meta as { capped?: boolean } | undefined)?.capped ?? false,
  };
}
