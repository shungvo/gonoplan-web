import { snapToGrid, type Coordinates } from '@/lib/geo/grid';

/**
 * Query key factory.
 *
 * Centralised so invalidation is precise: `invalidateQueries({ queryKey:
 * queryKeys.places.all })` clears every place query without touching reviews
 * or the session. Ad-hoc inline key arrays make that impossible to do safely.
 */
export const queryKeys = {
  session: ['session'] as const,

  places: {
    all: ['places'] as const,

    /**
     * The location is snapped before it enters the key, so small GPS drift
     * reuses the cached result instead of refetching identical data.
     */
    nearby: (coords: Coordinates, radiusMeters: number, filters?: Record<string, unknown>) =>
      ['places', 'nearby', snapToGrid(coords), radiusMeters, filters ?? {}] as const,

    map: (bbox: [number, number, number, number], zoom: number) =>
      ['places', 'map', bbox.map((n) => Math.round(n * 1000) / 1000), zoom] as const,

    detail: (idOrSlug: string) => ['places', 'detail', idOrSlug] as const,
    // Accepts null as well as undefined: the location store holds `null` when
    // there is no fix, and forcing every caller to convert would be noise.
    search: (query: string, coords?: Coordinates | null) =>
      ['places', 'search', query, coords ? snapToGrid(coords, 1000) : null] as const,
    similar: (id: string) => ['places', 'similar', id] as const,
  },

  recommendations: {
    all: ['recommendations'] as const,
    feed: (coords: Coordinates, radiusMeters: number) =>
      ['recommendations', 'feed', snapToGrid(coords), radiusMeters] as const,
    collections: (coords: Coordinates) =>
      ['recommendations', 'collections', snapToGrid(coords)] as const,
  },

  reviews: {
    all: ['reviews'] as const,
    byPlace: (placeId: string, sort: string) => ['reviews', placeId, sort] as const,
  },

  favorites: {
    all: ['favorites'] as const,
    list: () => ['favorites', 'list'] as const,
  },

  checkins: {
    all: ['checkins'] as const,
    byUser: (userId: string) => ['checkins', 'user', userId] as const,
    byPlace: (placeId: string) => ['checkins', 'place', placeId] as const,
  },

  categories: ['categories'] as const,

  owner: {
    all: ['owner'] as const,
    places: () => ['owner', 'places'] as const,
    analytics: (placeId: string) => ['owner', 'analytics', placeId] as const,
  },

  admin: {
    all: ['admin'] as const,
    dashboard: () => ['admin', 'dashboard'] as const,
    pendingPlaces: (page: number) => ['admin', 'places', 'pending', page] as const,
  },
} as const;
