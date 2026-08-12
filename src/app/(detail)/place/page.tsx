import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PlacePageClient } from './[idOrSlug]/PlacePageClient';
import { PlaceQueryShell } from './PlaceQueryShell';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // No place name: this route is reached by query string, and reading one on
  // the server would mean rendering it dynamically — which is the whole thing
  // a static export cannot do.
  return { title: t('meta.placeFallback'), robots: { index: false, follow: false } };
}

/**
 * The query-string form of `/place/[idOrSlug]`, and the only one that survives
 * a static export. `src/lib/navigation/links.ts` explains why in full.
 *
 * `useSearchParams` suspends during prerender, so the boundary is required
 * rather than defensive — without it the export fails on this page.
 */
export default function PlaceQueryPage() {
  return (
    <Suspense fallback={<PlacePageClient idOrSlug={null} />}>
      <PlaceQueryShell />
    </Suspense>
  );
}
