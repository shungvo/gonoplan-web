import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExploreScreen } from '@/features/places/components/ExploreScreen';

import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('meta.explore') };
}

export default function ExplorePage() {
  // `useSearchParams` needs a Suspense boundary, or reading `?category` would
  // opt the whole route out of static rendering at build time.
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <ExploreScreen />
    </Suspense>
  );
}
