'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMapMarkers } from '../api';
import type { MapBounds } from '@/lib/map/types';

/**
 * Snaps a viewport to a coarse grid before it becomes a cache key.
 *
 * Panning emits a `moveend` on every gesture, and raw bounds differ by
 * fractions of a degree each time — every one a cache miss for a result that is
 * effectively identical. Rounding makes small nudges reuse the previous
 * response, the same trick the nearby query uses for GPS jitter
 * (`lib/geo/grid.ts`).
 *
 * The precision is zoom-dependent: at city zoom a ~0.01° cell is a few hundred
 * metres and rounding is invisible; at street zoom the same cell would swallow
 * the whole viewport.
 */
function quantiseBounds(bounds: MapBounds, zoom: number): MapBounds {
  const precision = zoom >= 15 ? 1000 : zoom >= 12 ? 200 : 50;
  const snap = (value: number, down: boolean) =>
    (down ? Math.floor(value * precision) : Math.ceil(value * precision)) / precision;

  return {
    minLng: snap(bounds.minLng, true),
    minLat: snap(bounds.minLat, true),
    maxLng: snap(bounds.maxLng, false),
    maxLat: snap(bounds.maxLat, false),
  };
}

export function useMapMarkers(
  bounds: MapBounds | null,
  zoom: number,
  categorySlugs: string[],
) {
  const key = bounds ? quantiseBounds(bounds, zoom) : null;

  return useQuery({
    queryKey: ['places', 'map', key, categorySlugs],
    queryFn: () => fetchMapMarkers(key!, { categorySlugs }),
    enabled: key !== null,
    staleTime: 60_000,
    // Keeps the previous markers on screen while the next viewport loads.
    // Clearing them would make every pan flash an empty map.
    placeholderData: (previous) => previous,
  });
}
