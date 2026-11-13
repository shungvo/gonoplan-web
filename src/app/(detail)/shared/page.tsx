import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SharedPlanScreen } from '@/features/plans/components/SharedPlanScreen';
import { SharedPlanShell } from './SharedPlanShell';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  /*
   * Not the plan's own title: the build is static, so there is no server to
   * read the token and look the plan up.
   *
   * Never indexed. A shared plan is "anyone with the link", which is a
   * narrower promise than "anyone who searches" — a crawler following a link
   * somebody pasted in public must not turn one into the other.
   */
  return { title: t('shared.metaTitle'), robots: { index: false, follow: false } };
}

/**
 * A plan, opened from its public link: `/shared/?t=<token>`.
 *
 * In the `(detail)` group, so there is no tab bar and no onboarding in front
 * of it — the reader is usually somebody who has never opened the app, and
 * they came for one thing.
 *
 * A query string rather than `/shared/<token>` for the reason every record
 * link in this app is one: see `src/lib/navigation/links.ts`.
 */
export default function SharedPlanPage() {
  return (
    <Suspense fallback={<SharedPlanScreen token={null} />}>
      <SharedPlanShell />
    </Suspense>
  );
}
