'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { Coordinates } from '@/lib/geo/grid';
import { fetchNearbyPlaces, fetchPlaceDetail, type NearbyParams, type PlaceCard } from '../api';

/**
 * Progressive radius widening.
 *
 * A sparse area is the normal case for a discovery app in a new city, not an
 * error. Rather than showing "nothing found" at 2 km, the query walks outward
 * until it has enough to be useful and reports which radius it settled on, so
 * the UI can say "nothing within 2 km — showing places across the city"
 * (docs/03-platform.md §2.3).
 */
const RADIUS_LADDER = [2000, 5000, 15000, 50000] as const;
const ENOUGH_RESULTS = 4;

export interface NearbyResult {
  places: PlaceCard[];
  /** The radius that actually produced these results. */
  radiusMeters: number;
  widened: boolean;
}

async function fetchWithWidening(
  params: Omit<NearbyParams, 'radiusMeters'>,
): Promise<NearbyResult> {
  let last: NearbyResult = { places: [], radiusMeters: RADIUS_LADDER[0], widened: false };

  for (const radiusMeters of RADIUS_LADDER) {
    const result = await fetchNearbyPlaces({ ...params, radiusMeters });
    last = {
      places: result.data,
      radiusMeters,
      widened: radiusMeters !== RADIUS_LADDER[0],
    };
    if (result.data.length >= ENOUGH_RESULTS) break;
  }

  return last;
}

export function useNearbyPlaces(
  origin: Coordinates | null,
  options: {
    limit?: number;
    categorySlugs?: string[];
    minRating?: number;
    openNow?: boolean;
    enabled?: boolean;
  } = {},
) {
  const { limit = 12, categorySlugs, minRating, openNow, enabled = true } = options;

  return useQuery({
    // The key snaps coordinates to a grid, so GPS drift reuses the cached
    // result instead of refetching identical data (lib/geo/grid.ts).
    queryKey: queryKeys.places.nearby(origin ?? { latitude: 0, longitude: 0 }, 0, {
      limit,
      categorySlugs,
      minRating,
      openNow,
    }),
    queryFn: () =>
      fetchWithWidening({
        latitude: origin!.latitude,
        longitude: origin!.longitude,
        limit,
        ...(categorySlugs?.length ? { categorySlugs } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
        ...(openNow ? { openNow } : {}),
      }),
    enabled: enabled && origin !== null,
    staleTime: 5 * 60_000,
  });
}

export function usePlaceDetail(idOrSlug: string | null, origin: Coordinates | null) {
  return useQuery({
    queryKey: queryKeys.places.detail(idOrSlug ?? ''),
    queryFn: () => fetchPlaceDetail(idOrSlug!, origin),
    enabled: idOrSlug !== null && idOrSlug.length > 0,
    staleTime: 60_000,
  });
}
