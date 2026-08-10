'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDirections, type Route, type TravelMode } from './api';
import type { Coordinates } from '@/lib/geo/grid';

/**
 * A route from here to there.
 *
 * Coordinates are rounded into the query key at about eleven metres, matching
 * the server's cache key. Without that, standing still re-fetches on every GPS
 * jitter — and every one of those is a metered upstream call.
 */
export function useDirections(
  from: Coordinates | null,
  to: Coordinates | null,
  mode: TravelMode = 'driving',
) {
  const snap = (value: number) => Number(value.toFixed(4));

  return useQuery<Route>({
    queryKey: [
      'directions',
      from ? [snap(from.latitude), snap(from.longitude)] : null,
      to ? [snap(to.latitude), snap(to.longitude)] : null,
      mode,
    ],
    queryFn: () => fetchDirections({ from: from!, to: to!, mode }),
    enabled: from !== null && to !== null,
    staleTime: 60 * 60_000,
    // "No route between those two points" is a real answer, not a blip.
    retry: false,
  });
}

/** "12 min" — the number people actually compare. */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${String(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${String(hours)} hr` : `${String(hours)} hr ${String(rest)} min`;
}
