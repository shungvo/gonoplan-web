'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import {
  createReview,
  deleteReview,
  fetchReviewSummary,
  fetchReviews,
  setHelpful,
  updateReview,
  type Review,
  type ReviewSort,
} from '../api';

export function useReviews(placeId: string | null, sort: ReviewSort) {
  return useQuery({
    queryKey: queryKeys.reviews.byPlace(placeId ?? '', sort),
    queryFn: () => fetchReviews(placeId!, { sort }),
    enabled: placeId !== null,
    staleTime: 60_000,
  });
}

export function useReviewSummary(placeId: string | null) {
  return useQuery({
    queryKey: ['reviews', 'summary', placeId],
    queryFn: () => fetchReviewSummary(placeId!),
    enabled: placeId !== null,
    staleTime: 60_000,
  });
}

/**
 * Invalidates everything a rating change touches.
 *
 * A new review moves the place's average, which appears on the detail screen,
 * in every rail, in search results and on the map marker. Invalidating only the
 * review list would leave the user looking at the old average directly above
 * the review they just wrote.
 */
function useInvalidateAfterRatingChange(placeId: string) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    void queryClient.invalidateQueries({ queryKey: ['reviews', 'summary', placeId] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
  };
}

export function useCreateReview(placeId: string) {
  const invalidate = useInvalidateAfterRatingChange(placeId);

  return useMutation({
    mutationFn: (input: { rating: number; content?: string; imageKeys?: string[] }) =>
      createReview(placeId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateReview(placeId: string) {
  const invalidate = useInvalidateAfterRatingChange(placeId);

  return useMutation({
    mutationFn: ({
      reviewId,
      ...input
    }: {
      reviewId: string;
      rating?: number;
      content?: string | null;
      imageKeys?: string[];
    }) => updateReview(reviewId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteReview(placeId: string) {
  const invalidate = useInvalidateAfterRatingChange(placeId);

  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: invalidate,
  });
}

/**
 * Helpful votes, applied optimistically.
 *
 * The button must feel instant — it is a low-stakes toggle, and waiting on a
 * round trip to fill in a heart is exactly the latency people notice. On
 * failure the previous cache is restored, so a rejected vote visibly snaps
 * back rather than lying.
 */
export function useToggleHelpful(placeId: string, sort: ReviewSort) {
  const queryClient = useQueryClient();
  const key = queryKeys.reviews.byPlace(placeId, sort);

  return useMutation({
    mutationFn: ({ reviewId, helpful }: { reviewId: string; helpful: boolean }) =>
      setHelpful(reviewId, helpful),

    onMutate: async ({ reviewId, helpful }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old: { data: Review[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((review) =>
            review.id === reviewId
              ? {
                  ...review,
                  hasVoted: helpful,
                  helpfulCount: review.helpfulCount + (helpful ? 1 : -1),
                }
              : review,
          ),
        };
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
