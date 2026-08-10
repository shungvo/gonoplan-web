import { api, type ApiResult } from '@/lib/api/client';
import type { components } from '@/types/api';

export type Review = components['schemas']['Review'];
export type ReviewSummary = components['schemas']['ReviewSummary'];

export type ReviewSort = 'recent' | 'helpful' | 'rating_high' | 'rating_low';

export function fetchReviews(
  placeId: string,
  options: { sort?: ReviewSort; limit?: number; cursor?: string } = {},
): Promise<ApiResult<Review[]>> {
  return api.getWithMeta<Review[]>(`/places/${placeId}/reviews`, {
    query: {
      sort: options.sort ?? 'helpful',
      limit: options.limit ?? 10,
      ...(options.cursor ? { cursor: options.cursor } : {}),
    },
  });
}

export function fetchReviewSummary(placeId: string): Promise<ReviewSummary> {
  return api.get<ReviewSummary>(`/places/${placeId}/reviews/summary`);
}

export function createReview(
  placeId: string,
  input: { rating: number; content?: string; imageKeys?: string[] },
): Promise<Review> {
  return api.post<Review>(`/places/${placeId}/reviews`, input);
}

export function updateReview(
  reviewId: string,
  input: { rating?: number; content?: string | null; imageKeys?: string[] },
): Promise<Review> {
  return api.patch<Review>(`/reviews/${reviewId}`, input);
}

export function deleteReview(reviewId: string): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(`/reviews/${reviewId}`);
}

export function setHelpful(
  reviewId: string,
  helpful: boolean,
): Promise<{ helpfulCount: number; hasVoted: boolean }> {
  const path = `/reviews/${reviewId}/helpful`;
  return helpful
    ? api.post<{ helpfulCount: number; hasVoted: boolean }>(path)
    : api.delete<{ helpfulCount: number; hasVoted: boolean }>(path);
}
