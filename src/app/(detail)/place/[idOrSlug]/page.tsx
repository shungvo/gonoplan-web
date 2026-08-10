import type { Metadata } from 'next';
import { fetchPlaceDetail } from '@/features/places/api';
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
      `${place.category.name} in ${place.district ?? place.province}. Discover it on Gonoplan.`;

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
    return { title: 'Place', description: 'Discover places on Gonoplan.' };
  }
}

export default async function PlacePage({ params }: PageProps<'/place/[idOrSlug]'>) {
  const { idOrSlug } = await params;
  return <PlacePageClient idOrSlug={idOrSlug} />;
}
