'use client';

import { useSearchParams } from 'next/navigation';
import { VerifyEmailScreen } from '@/features/auth/components/VerifyEmailScreen';

/**
 * Reads the link's token out of `?token=`.
 *
 * Its own file because `useSearchParams` suspends during prerender, and the
 * static export only builds if whatever calls it sits inside a boundary.
 */
export function Shell() {
  return <VerifyEmailScreen token={useSearchParams().get('token')} />;
}
