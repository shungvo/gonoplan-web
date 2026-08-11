import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { applySavedState, restoreCaches } from './cache';

const PLACE_ID = '63fba6bd-6e14-4c3e-9bcd-2c157c8e9d05';
const OTHER_ID = 'e6aaf177-447a-42cc-a368-3d4331223d3f';

function card(id: string, isSaved: boolean, saveCount = 4) {
  return {
    id,
    slug: `place-${id}`,
    name: 'Somewhere',
    isSaved,
    saveCount,
    // A card's category carries a uuid of its own. Nothing here may follow it.
    category: { id: PLACE_ID, slug: 'cafe', colorHex: '#000' },
  };
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('applySavedState', () => {
  it('patches a place inside a recommendation rail', () => {
    const queryClient = client();
    const key = queryKeys.recommendations.collections({ latitude: 16, longitude: 108 });
    queryClient.setQueryData(key, [
      { key: 'popular-near-you', places: [card(PLACE_ID, false), card(OTHER_ID, false)] },
    ]);

    applySavedState(queryClient, PLACE_ID, true);

    const rails = queryClient.getQueryData<{ places: { id: string; isSaved: boolean }[] }[]>(key);
    expect(rails?.[0]?.places[0]?.isSaved).toBe(true);
    expect(rails?.[0]?.places[1]?.isSaved).toBe(false);
  });

  /*
   * The mutation only knows the id; the full-page route caches under the slug
   * from the URL. Keying the write by id is what used to make the bookmark on
   * /place/[slug] wait for a round trip.
   */
  it('patches a detail cached under its slug', () => {
    const queryClient = client();
    const key = queryKeys.places.detail('reaching-out-tea-house');
    queryClient.setQueryData(key, card(PLACE_ID, false, 9));

    applySavedState(queryClient, PLACE_ID, true);

    expect(queryClient.getQueryData<{ isSaved: boolean; saveCount: number }>(key)).toMatchObject({
      isSaved: true,
      saveCount: 10,
    });
  });

  it('patches the saved list through its response envelope', () => {
    const queryClient = client();
    const key = queryKeys.favorites.list();
    queryClient.setQueryData(key, { data: [card(PLACE_ID, true)], meta: { total: 1 } });

    applySavedState(queryClient, PLACE_ID, false);

    const saved = queryClient.getQueryData<{ data: { isSaved: boolean; saveCount: number }[] }>(key);
    expect(saved?.data[0]).toMatchObject({ isSaved: false, saveCount: 3 });
  });

  it('never takes the count below zero', () => {
    const queryClient = client();
    const key = queryKeys.places.detail(PLACE_ID);
    queryClient.setQueryData(key, card(PLACE_ID, true, 0));

    applySavedState(queryClient, PLACE_ID, false);

    expect(queryClient.getQueryData<{ saveCount: number }>(key)?.saveCount).toBe(0);
  });

  it('leaves untouched caches identical, not merely equal', () => {
    const queryClient = client();
    const key = queryKeys.places.detail(OTHER_ID);
    const before = card(OTHER_ID, false);
    queryClient.setQueryData(key, before);

    applySavedState(queryClient, PLACE_ID, true);

    // Reference equality: a new object here would re-render every screen
    // showing any place on every save.
    expect(queryClient.getQueryData(key)).toBe(before);
  });

  it('restores what it replaced', () => {
    const queryClient = client();
    const key = queryKeys.places.detail(PLACE_ID);
    queryClient.setQueryData(key, card(PLACE_ID, false, 4));

    const snapshot = applySavedState(queryClient, PLACE_ID, true);
    expect(queryClient.getQueryData<{ isSaved: boolean }>(key)?.isSaved).toBe(true);

    restoreCaches(queryClient, snapshot);
    expect(queryClient.getQueryData<{ isSaved: boolean; saveCount: number }>(key)).toMatchObject({
      isSaved: false,
      saveCount: 4,
    });
  });
});
