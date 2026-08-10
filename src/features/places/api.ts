import { api, type ApiResult } from '@/lib/api/client';
import type { Coordinates } from '@/lib/geo/grid';
import type { components } from '@/types/api';

export type PlaceCard = components['schemas']['PlaceCard'];
export type PlaceDetail = components['schemas']['PlaceDetail'];

export interface NearbyParams extends Coordinates {
  radiusMeters?: number;
  limit?: number;
  categorySlugs?: string[];
  priceRanges?: string[];
  minRating?: number;
  openNow?: boolean;
  cursor?: string;
}

export function fetchNearbyPlaces(params: NearbyParams): Promise<ApiResult<PlaceCard[]>> {
  return api.getWithMeta<PlaceCard[]>('/places', {
    withAuth: false,
    query: {
      lat: params.latitude,
      lng: params.longitude,
      radius: params.radiusMeters ?? 5000,
      limit: params.limit ?? 20,
      ...(params.categorySlugs?.length ? { category: params.categorySlugs.join(',') } : {}),
      ...(params.priceRanges?.length ? { priceRange: params.priceRanges.join(',') } : {}),
      ...(params.minRating !== undefined ? { minRating: params.minRating } : {}),
      ...(params.openNow ? { openNow: 'true' } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
    },
  });
}

/**
 * Full place detail.
 *
 * Sends the origin so the server computes distance with PostGIS rather than
 * the client approximating it — the same number the card showed, from the same
 * source, so the two never disagree by a few metres.
 */
export function fetchPlaceDetail(
  idOrSlug: string,
  origin?: Coordinates | null,
): Promise<PlaceDetail> {
  return api.get<PlaceDetail>(`/places/${encodeURIComponent(idOrSlug)}`, {
    query: origin ? { lat: origin.latitude, lng: origin.longitude } : {},
  });
}

export function searchPlaces(query: string, origin?: Coordinates | null): Promise<PlaceCard[]> {
  return api.get<PlaceCard[]>('/places/search', {
    withAuth: false,
    query: {
      q: query,
      ...(origin ? { lat: origin.latitude, lng: origin.longitude } : {}),
    },
  });
}
