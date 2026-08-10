import { api } from '@/lib/api/client';
import type { Coordinates } from '@/lib/geo/grid';
import type { components } from '@/types/api';

export type RankedPlace = components['schemas']['RankedPlace'];
export type RecommendationFeed = components['schemas']['RecommendationFeed'];
export type RecommendationCollection = components['schemas']['RecommendationCollection'];
export type CollectionKey = RecommendationCollection['key'];

/**
 * A stable, device-scoped id.
 *
 * Not an account and not a fingerprint: a random value this device generated
 * for itself, so logged-out browsing still teaches the recommender something
 * and that history can be merged on sign-up. Cleared with site data like
 * anything else in `localStorage`.
 */
const ANON_ID_KEY = 'gonoplan:anon-id';

export function anonId(): string {
  if (typeof window === 'undefined') return '';

  const existing = window.localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  window.localStorage.setItem(ANON_ID_KEY, fresh);
  return fresh;
}

/**
 * Headers every personalised read carries.
 *
 * `X-Local-Hour` is what makes "good for tonight" mean the user's evening
 * rather than the server's — the API runs in UTC and Vietnam is seven hours
 * ahead, so without it the rail appears at breakfast and vanishes at dinner.
 */
function signalHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return {
    'x-anon-id': anonId(),
    'x-local-hour': String(new Date().getHours()),
  };
}

export interface FeedParams extends Coordinates {
  radiusMeters?: number;
  limit?: number;
}

export function fetchRecommendations(params: FeedParams): Promise<RecommendationFeed> {
  return api.get<RecommendationFeed>('/recommendations', {
    headers: signalHeaders(),
    query: {
      lat: params.latitude,
      lng: params.longitude,
      radius: params.radiusMeters ?? 5000,
      limit: params.limit ?? 20,
    },
  });
}

/**
 * Every home rail in one request.
 *
 * Five sequential calls is the difference between a home screen that opens and
 * one that loads — and the home screen is the first thing anyone sees.
 */
export function fetchCollections(params: FeedParams): Promise<RecommendationCollection[]> {
  return api.get<RecommendationCollection[]>('/recommendations/collections', {
    headers: signalHeaders(),
    query: {
      lat: params.latitude,
      lng: params.longitude,
      radius: params.radiusMeters ?? 5000,
      limit: params.limit ?? 10,
    },
  });
}
