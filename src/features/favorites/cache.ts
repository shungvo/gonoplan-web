import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

/**
 * Every cache a place can be sitting in.
 *
 * The same place is cached under several keys at once — the home rails under
 * `recommendations`, the grid and the detail under `places`, the Saved list
 * under `favorites`. Saving from one of them has to move all of them, or the
 * screen you tapped goes on showing the old answer.
 */
const PREFIXES: QueryKey[] = [
  queryKeys.places.all,
  queryKeys.recommendations.all,
  queryKeys.favorites.all,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Rewrites every copy of one place inside a cached response.
 *
 * This walks the value rather than knowing the shape of each endpoint, because
 * the shapes genuinely differ: a bare array from search, `{ places }` from a
 * recommendation rail, `{ data, meta }` from the Saved list, the place itself
 * from detail. Enumerating them means every new endpoint silently stops
 * updating — which is the bug this replaces.
 *
 * A node is a place only if it carries this exact id *and* a boolean `isSaved`.
 * Ids alone are not enough: a card's `category` has a uuid too.
 *
 * Unchanged branches are returned by reference, so a save re-renders the
 * screens showing that place and leaves the rest of the cache alone.
 */
function patchPlace(value: unknown, placeId: string, isSaved: boolean): unknown {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const patched = patchPlace(item, placeId, isSaved);
      if (patched !== item) changed = true;
      return patched;
    });
    return changed ? next : value;
  }

  if (!isRecord(value)) return value;

  if (value['id'] === placeId && typeof value['isSaved'] === 'boolean') {
    if (value['isSaved'] === isSaved) return value;

    const saveCount = value['saveCount'];
    return {
      ...value,
      isSaved,
      // Not every shape carries the count, and it must never go negative —
      // an optimistic un-save of a place the server already had at 0 would
      // otherwise show "-1 saved" until the refetch lands.
      ...(typeof saveCount === 'number'
        ? { saveCount: Math.max(0, saveCount + (isSaved ? 1 : -1)) }
        : {}),
    };
  }

  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const patched = patchPlace(item, placeId, isSaved);
    if (patched !== item) changed = true;
    next[key] = patched;
  }
  return changed ? next : value;
}

/** What `applySavedState` changed, in the form `restoreCaches` wants back. */
export type CacheSnapshot = [QueryKey, unknown][];

/**
 * Applies a save to every cached place, and returns what was there before.
 */
export function applySavedState(
  queryClient: QueryClient,
  placeId: string,
  isSaved: boolean,
): CacheSnapshot {
  const previous: CacheSnapshot = [];

  for (const queryKey of PREFIXES) {
    previous.push(...queryClient.getQueriesData({ queryKey }));
    queryClient.setQueriesData({ queryKey }, (data: unknown) =>
      patchPlace(data, placeId, isSaved),
    );
  }

  return previous;
}

export function restoreCaches(queryClient: QueryClient, snapshot: CacheSnapshot): void {
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

/** Exported for the tests; the mutation goes through `applySavedState`. */
export const __testing = { patchPlace };
