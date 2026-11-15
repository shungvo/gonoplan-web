'use client';

import { useSearchParams } from 'next/navigation';
import { ResetPasswordScreen } from '@/features/auth/components/ResetPasswordScreen';

/**
 * Reads the link's token out of `?token=`.
 *
 * Its own file because `useSearchParams` suspends during prerender, and the
 * static export only builds if whatever calls it sits inside a boundary.
 */
export function Shell() {
  return <ResetPasswordScreen token={useSearchParams().get('token')} />;
}
