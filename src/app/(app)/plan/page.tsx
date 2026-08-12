import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PlansScreen } from '@/features/plans/components/PlansScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('plans.title') };
}

export default function PlanPage() {
  // `PlansScreen` reads `?id=` to open a plan, and `useSearchParams`
  // suspends during prerender — without the boundary the static export fails
  // on this page rather than at runtime.
  return (
    <Suspense fallback={null}>
      <PlansScreen />
    </Suspense>
  );
}
