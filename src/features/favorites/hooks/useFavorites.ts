'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useLocationStore } from '@/features/location/store';
import { useIsAuthenticated } from '@/features/auth/store';
import { applySavedState, restoreCaches } from '../cache';
import { fetchSavedPlaces, savePlace, unsavePlace } from '../api';

export function useSavedPlaces() {
  const coordinates = useLocationStore((state) => state.coordinates);
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: queryKeys.favorites.list(),
    queryFn: () => fetchSavedPlaces(coordinates),
    // Never fired while signed out: a guaranteed 401 is not a loading state,
    // and the Saved tab shows a sign-in prompt instead.
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

/**
 * Save toggle, applied optimistically.
 *
 * Saving is a one-tap gesture people fire while scrolling; a bookmark that
 * waits on a round trip feels broken. The previous cache is restored on
 * failure, so a rejected save visibly snaps back rather than lying about
 * having worked.
 *
 * The write goes to every cached copy of the place rather than to one key.
 * This used to patch `places.detail(placeId)` alone, which meant the home grid
 * — fed by `recommendations`, and keyed by nothing this touched — never moved
 * at all: the POST succeeded and the bookmark stayed empty. The full-page
 * detail route missed too, because it caches under the slug from the URL while
 * this only knew the id.
 */
export function useToggleSave(placeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (save: boolean) => (save ? savePlace(placeId) : unsavePlace(placeId)),

    onMutate: async (save) => {
      // An in-flight read would land after the optimistic write and undo it.
      await queryClient.cancelQueries({ queryKey: queryKeys.places.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.recommendations.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all });

      return { previous: applySavedState(queryClient, placeId, save) };
    },

    onError: (_error, _save, context) => {
      if (context) restoreCaches(queryClient, context.previous);
    },

    onSettled: () => {
      // The Saved tab's contents changed, and every card shows a save count.
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.all });
    },
  });
}
