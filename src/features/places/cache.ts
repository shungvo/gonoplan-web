import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { toCategoryIconKey } from '@/features/categories/icons';
import type { CategoryIconKey } from '@/features/categories/api';

/**
 * Everywhere a place is already sitting by the time somebody taps it.
 *
 * Same list as the save-state walker in `features/favorites/cache.ts`, and for
 * the same reason: a place is cached under whichever screen showed it, not
 * under one canonical key.
 */
const PREFIXES: QueryKey[] = [
  queryKeys.places.all,
  queryKeys.recommendations.all,
  queryKeys.favorites.all,
];

/**
 * The part of a place that every cached shape carries.
 *
 * Deliberately not `PlaceCard`. The point is to open the sheet on what is
 * already known, and the shapes in the cache do not all agree — a card, a
 * detail, and a rail entry carry different sets. These five fields are the
 * intersection, and they happen to be exactly what the first frame needs: a
 * photograph to show and a name to put on it.
 */
export interface PlacePreview {
  name: string;
  coverImageUrl: string | null;
  coverBlurhash: string | null;
  category: {
    slug: string;
    colorHex: string;
    name: string;
    nameVi?: string | undefined;
    /**
     * Narrowed rather than required. A response cached before `iconKey`
     * existed still makes a usable preview — the glyph falls back to a dot,
     * which is what an unknown key draws everywhere else — and rejecting the
     * whole entry over it would put the sheet back on a grey rectangle.
     */
    iconKey: CategoryIconKey;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asPreview(value: Record<string, unknown>): PlacePreview | null {
  const category = value['category'];
  if (typeof value['name'] !== 'string' || !isRecord(category)) return null;
  if (typeof category['slug'] !== 'string' || typeof category['colorHex'] !== 'string') return null;
  if (typeof category['name'] !== 'string') return null;

  const url = value['coverImageUrl'];
  const blurhash = value['coverBlurhash'];
  const nameVi = category['nameVi'];

  return {
    name: value['name'],
    coverImageUrl: typeof url === 'string' ? url : null,
    coverBlurhash: typeof blurhash === 'string' ? blurhash : null,
    category: {
      slug: category['slug'],
      colorHex: category['colorHex'],
      name: category['name'],
      nameVi: typeof nameVi === 'string' ? nameVi : undefined,
      iconKey: toCategoryIconKey(category['iconKey']),
    },
  };
}

/**
 * Finds one place inside a cached response, whatever shape that response has.
 *
 * Walks rather than knowing each endpoint, for the reason set out in the
 * favorites walker: the shapes genuinely differ, and enumerating them means
 * every new endpoint silently stops working.
 *
 * Matches on id *or* slug, because the sheet is opened with whichever the
 * caller had — the map has ids, a shared link has a slug.
 */
function search(value: unknown, idOrSlug: string): PlacePreview | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = search(item, idOrSlug);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  if (value['id'] === idOrSlug || value['slug'] === idOrSlug) {
    const preview = asPreview(value);
    // A node can carry a matching id without being a place — a review's
    // `placeId`, a category that shares no shape with this. Falling through
    // keeps looking rather than returning a half-built preview.
    if (preview) return preview;
  }

  for (const item of Object.values(value)) {
    const found = search(item, idOrSlug);
    if (found) return found;
  }
  return null;
}

/**
 * What is already known about a place, before its detail is fetched.
 *
 * The screen that was tapped had the photograph on screen a moment ago, so
 * making the sheet open on a grey rectangle and a spinner is throwing away an
 * answer we are holding. Returns null when the place came from somewhere with
 * no cached copy — a deep link, a cold start — and the caller falls back to a
 * skeleton.
 */
export function findCachedPlace(
  queryClient: QueryClient,
  idOrSlug: string,
): PlacePreview | null {
  for (const queryKey of PREFIXES) {
    for (const [, data] of queryClient.getQueriesData({ queryKey })) {
      const found = search(data, idOrSlug);
      if (found) return found;
    }
  }
  return null;
}
