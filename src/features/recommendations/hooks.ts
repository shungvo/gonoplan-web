'use client';

import { useQuery } from '@tanstack/react-query';
import { snapToGrid, type Coordinates } from '@/lib/geo/grid';
import { fetchCollections, fetchRecommendations, type CollectionKey } from './api';

/**
 * The home rails.
 *
 * Snapped to the same coarse grid the nearby query uses, so standing still
 * does not refetch on every GPS jitter — each of those would be five ranked
 * SQL queries for a result that is identical.
 *
 * `staleTime` is deliberately long. A ranked feed that reshuffles while
 * someone is reading it is worse than one that is five minutes old: they lose
 * the card they were about to tap.
 */
export function useCollections(origin: Coordinates, limit = 10) {
  const snapped = snapToGrid(origin);

  return useQuery({
    queryKey: ['recommendations', 'collections', snapped.latitude, snapped.longitude, limit],
    queryFn: () => fetchCollections({ ...origin, limit }),
    staleTime: 5 * 60_000,
  });
}

export function useRecommendations(origin: Coordinates, limit = 20) {
  const snapped = snapToGrid(origin);

  return useQuery({
    queryKey: ['recommendations', 'feed', snapped.latitude, snapped.longitude, limit],
    queryFn: () => fetchRecommendations({ ...origin, limit }),
    staleTime: 5 * 60_000,
  });
}

/**
 * Picks a rail, falling back through equivalents.
 *
 * Rails are omitted when they cannot apply — `recommended-for-you` needs an
 * account, `good-for-tonight` only exists after 16:00 — so a screen slot bound
 * to one key would be empty for half its audience and half the day. The
 * fallback keeps every slot filled with the closest thing available.
 */
export function pickRail<T extends { key: CollectionKey }>(
  collections: T[] | undefined,
  preference: CollectionKey[],
): T | undefined {
  if (!collections) return undefined;
  for (const key of preference) {
    const found = collections.find((collection) => collection.key === key);
    if (found) return found;
  }
  return undefined;
}
