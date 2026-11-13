'use client';

import { useSearchParams } from 'next/navigation';
import { SharedPlanScreen } from '@/features/plans/components/SharedPlanScreen';

/**
 * Reads the token out of `?t=`.
 *
 * Its own file because `useSearchParams` suspends during prerender, and the
 * page has to wrap whatever calls it in a boundary for the static export to
 * build at all.
 */
export function SharedPlanShell() {
  const token = useSearchParams().get('t');
  return <SharedPlanScreen token={token} />;
}
