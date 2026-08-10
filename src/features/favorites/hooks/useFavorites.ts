'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useLocationStore } from '@/features/location/store';
import { useIsAuthenticated } from '@/features/auth/store';
import type { PlaceDetail } from '@/features/places/api';
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
 * Saving is a one-tap gesture people fire while scrolling; a filled heart that
 * waits on a round trip feels broken. The previous cache is restored on
 * failure, so a rejected save visibly snaps back rather than lying about
 * having worked.
 */
export function useToggleSave(placeId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.places.detail(placeId);

  return useMutation({
    mutationFn: (save: boolean) => (save ? savePlace(placeId) : unsavePlace(placeId)),

    onMutate: async (save) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PlaceDetail>(detailKey);

      queryClient.setQueryData<PlaceDetail>(detailKey, (old) =>
        old
          ? { ...old, isSaved: save, saveCount: old.saveCount + (save ? 1 : -1) }
          : old,
      );

      return { previous };
    },

    onError: (_error, _save, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      // The Saved tab's contents changed, and every list shows a save count.
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    },
  });
}
