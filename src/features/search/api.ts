import { api } from '@/lib/api/client';

export interface PopularSearch {
  query: string;
  searches: number;
}

/**
 * The most-searched queries that actually found something.
 *
 * Returns an empty array until enough real searches have been recorded, which
 * is the honest behaviour — the alternative is inventing a list and calling it
 * popular. Callers fall back to browsing by category.
 */
export function fetchPopularSearches(limit = 8): Promise<PopularSearch[]> {
  return api.get<PopularSearch[]>('/places/search/popular', {
    withAuth: false,
    query: { limit },
  });
}
