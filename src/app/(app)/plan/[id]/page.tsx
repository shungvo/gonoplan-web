import type { Metadata } from 'next';
import { PlanEditorScreen } from '@/features/plans/components/PlanEditorScreen';
import { getT } from '@/i18n/server';

/**
 * The plan itself is private, so the title cannot name it — fetching it here
 * would need the caller's session, and a page title is not worth handing the
 * server a token for.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('plans.title'), robots: { index: false, follow: false } };
}

export default async function PlanDetailPage({ params }: PageProps<'/plan/[id]'>) {
  const { id } = await params;
  return <PlanEditorScreen planId={id} />;
}
