'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import {
  createCheckIn,
  deleteCheckIn,
  fetchCheckIns,
  type CheckIn,
  type CheckInFilter,
  type CheckInPage,
  type CreateCheckInInput,
} from './api';

const PAGE_SIZE = 12;

/**
 * A profile's photographs, or a place's, page by page.
 *
 * Keyset paging rather than offsets, matched to what the API does: a profile
 * that gains a post while somebody is scrolling shifts every offset by one and
 * shows them the same row twice.
 */
export function useCheckIns(filter: CheckInFilter | null) {
  const key =
    filter === null
      ? queryKeys.checkins.all
      : 'userId' in filter
        ? queryKeys.checkins.byUser(filter.userId)
        : queryKeys.checkins.byPlace(filter.placeId);

  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      fetchCheckIns(filter!, {
        limit: PAGE_SIZE,
        ...(typeof pageParam === 'string' ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: CheckInPage) => last.cursor ?? undefined,
    enabled: filter !== null,
  });
}

/** Flattens the pages into the one list every view here actually renders. */
export function flattenCheckIns(pages: CheckInPage[] | undefined): CheckIn[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

export function useCreateCheckIn(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCheckInInput) => createCheckIn(input),
    onSuccess: async (created) => {
      /*
       * Both feeds this post now belongs to, plus the profile that counts it.
       *
       * The place's gallery matters as much as the author's: somebody who
       * posts from a place and then opens it should see their own photograph
       * there, and invalidating only the profile would leave the place showing
       * a stale gallery until React Query decided to refetch on its own.
       */
      await Promise.all([
        userId
          ? queryClient.invalidateQueries({ queryKey: queryKeys.checkins.byUser(userId) })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.checkins.byPlace(created.place.id),
        }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
  });
}

export function useDeleteCheckIn(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkIn: CheckIn) => deleteCheckIn(checkIn.id),
    onSuccess: async (_result, checkIn) => {
      await Promise.all([
        userId
          ? queryClient.invalidateQueries({ queryKey: queryKeys.checkins.byUser(userId) })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.checkins.byPlace(checkIn.place.id),
        }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
  });
}
