import { Suspense } from 'react';
import { ExploreScreen } from '@/features/places/components/ExploreScreen';

export const metadata = { title: 'Explore' };

export default function ExplorePage() {
  // `useSearchParams` needs a Suspense boundary, or reading `?category` would
  // opt the whole route out of static rendering at build time.
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <ExploreScreen />
    </Suspense>
  );
}
