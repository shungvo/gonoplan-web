import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { ResetPasswordScreen } from '@/features/auth/components/ResetPasswordScreen';
import { Shell } from './Shell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // Never indexed: the URL carries a one-time secret.
  return { title: t('reset.metaTitle'), robots: { index: false, follow: false } };
}

/**
 * Where an emailed link lands — `/reset-password/?token=…`.
 *
 * In the `(detail)` group: no tab bar and no onboarding in front of it. The
 * person arriving came from their mail app to do exactly one thing.
 */
export default function Page() {
  return (
    <Suspense fallback={<ResetPasswordScreen token={null} />}>
      <Shell />
    </Suspense>
  );
}
