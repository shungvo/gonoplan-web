import type { Metadata } from 'next';
import { fetchPlaceDetail } from '@/features/places/api';
import { getT } from '@/i18n/server';
import { PlacePageClient } from './PlacePageClient';

/**
 * Deep-linkable place detail.
 *
 * The API accepts either form, so `/place/saigon-opera-house` and
 * `/place/<uuid>` both resolve.
 */

export async function generateMetadata({
  params,
}: PageProps<'/place/[idOrSlug]'>): Promise<Metadata> {
  const { idOrSlug } = await params;
  const t = await getT();

  /*
   * Fetched, not derived from the slug.
   *
   * Deriving looked cheaper but is wrong twice over: slugs are unaccented, so
   * "Cà Phê Đường Sách" comes back as "Ca Phe Duong Sach"; and stripping the
   * random suffix needs a heuristic that cannot tell `-a3f9k2` from `-house`.
   * It rendered "Saigon Opera House" as "Saigon Opera".
   *
   * This is the page people share, so the title and preview have to be right.
   * One server-side call to our own API is the correct price for that.
   */
  try {
    const place = await fetchPlaceDetail(idOrSlug);

    const description =
      place.description?.slice(0, 160) ??
      t('meta.placeDescription', {
        category: place.category.name,
        area: place.district ?? place.province,
      });

    return {
      title: place.name,
      description,
      openGraph: {
        title: place.name,
        description,
        type: 'website',
        ...(place.coverImageUrl ? { images: [{ url: place.coverImageUrl }] } : {}),
      },
    };
  } catch {
    // A deleted place or an unreachable API must not break the page render —
    // the client component shows a proper "no longer available" state.
    return { title: t('meta.placeFallback'), description: t('meta.placeFallbackDescription') };
  }
}

export default async function PlacePage({ params }: PageProps<'/place/[idOrSlug]'>) {
  const { idOrSlug } = await params;
  return <PlacePageClient idOrSlug={idOrSlug} />;
}

/**
 * A single placeholder, for the native build only.
 *
 * `output: 'export'` refuses a dynamic route with no params and refuses an
 * empty list too — "at least one route must be generated". Neither is
 * satisfiable here: the ids are user-generated, so the real list cannot be
 * known at build time.
 *
 * So this emits one shell nothing links to, purely to let the export finish.
 * The app reaches these screens through the query form instead
 * (`src/lib/navigation/links.ts`), which needs no file per record. The web
 * build ignores this entirely — there is a server there, and the path routes
 * stay fully dynamic for the pretty URLs that get shared.
 */
export function generateStaticParams() {
  return [{ idOrSlug: '_' }];
}
