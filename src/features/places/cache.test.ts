import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { findCachedPlace } from './cache';

const CATEGORY = { id: 'cat-1', slug: 'cafe', name: 'Cafe', nameVi: 'Quán cà phê', colorHex: '#8b5a2b' };

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'place-1',
    slug: 'ca-phe-o-quan-1',
    name: 'Cà phê Quận 1',
    category: CATEGORY,
    coverImageUrl: 'https://example.test/cover.jpg',
    coverBlurhash: 'LKO2?U%2Tw=w',
    isSaved: false,
    ...overrides,
  };
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('findCachedPlace', () => {
  it('finds a place in a bare array, as search returns one', () => {
    const qc = client();
    qc.setQueryData(queryKeys.places.search('ca phe'), [card({ id: 'other' }), card()]);

    expect(findCachedPlace(qc, 'place-1')?.name).toBe('Cà phê Quận 1');
  });

  it('finds one nested inside a rail, as the home feed returns them', () => {
    const qc = client();
    qc.setQueryData(queryKeys.recommendations.collections({ latitude: 10.8, longitude: 106.7 }), [
      { title: 'Gần bạn', places: [] },
      { title: 'Hợp cho tối nay', places: [card()] },
    ]);

    expect(findCachedPlace(qc, 'place-1')?.coverImageUrl).toBe('https://example.test/cover.jpg');
  });

  it('finds one behind a meta envelope, as the saved list returns them', () => {
    const qc = client();
    qc.setQueryData(queryKeys.favorites.list(), { data: [card()], meta: { total: 1 } });

    expect(findCachedPlace(qc, 'place-1')?.category.nameVi).toBe('Quán cà phê');
  });

  it('matches on slug too, since a shared link carries one', () => {
    const qc = client();
    qc.setQueryData(queryKeys.favorites.list(), { data: [card()] });

    expect(findCachedPlace(qc, 'ca-phe-o-quan-1')?.name).toBe('Cà phê Quận 1');
  });

  // The whole point is opening on something rather than a spinner, so a place
  // with no photograph still has to come back — the category fallback is a
  // designed stand-in, not an absence.
  it('returns a place that has no photograph', () => {
    const qc = client();
    qc.setQueryData(queryKeys.favorites.list(), {
      data: [card({ coverImageUrl: null, coverBlurhash: null })],
    });

    expect(findCachedPlace(qc, 'place-1')).toMatchObject({
      coverImageUrl: null,
      coverBlurhash: null,
    });
  });

  // An id alone is not enough to call something a place: every card carries a
  // category with a uuid of its own, and a category has a `name` too. Matching
  // one would open the sheet titled "Cafe" over no photograph.
  it('ignores a node that shares the id but is not a place', () => {
    const qc = client();
    qc.setQueryData(queryKeys.places.search('ca phe'), [card()]);

    expect(findCachedPlace(qc, 'cat-1')).toBeNull();
  });

  it('returns null when nothing has shown the place', () => {
    expect(findCachedPlace(client(), 'place-1')).toBeNull();
  });
});
