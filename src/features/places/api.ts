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
    // Carries the session when there is one: the server decides `isSaved` per
    // viewer, and without the token every card comes back unsaved.
    withAuth: 'optional',
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
    // Same as the list, plus: the server attaches a signed-in caller's search
    // to their account, which is what later personalises recommendations.
    withAuth: 'optional',
    query: {
      q: query,
      ...(origin ? { lat: origin.latitude, lng: origin.longitude } : {}),
    },
  });
}

export const PRICE_RANGES = ['BUDGET', 'MODERATE', 'EXPENSIVE', 'LUXURY'] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

export interface SubmitPlaceInput {
  name: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  address: string;
  province: string;
  description?: string;
  district?: string;
  phone?: string;
  website?: string;
  priceRange?: PriceRange;
  /** Keys from `/uploads/confirm`, never URLs. The first becomes the cover. */
  imageKeys?: string[];
}

export interface SubmissionResult {
  id: string;
  slug: string;
  status: 'PENDING' | 'APPROVED';
  message: string;
}

/**
 * Submits a place for review.
 *
 * Always lands PENDING — there is no client-visible path to publishing
 * directly, whatever role the submitter has.
 */
export function submitPlace(input: SubmitPlaceInput): Promise<SubmissionResult> {
  return api.post<SubmissionResult>('/places', input);
}
