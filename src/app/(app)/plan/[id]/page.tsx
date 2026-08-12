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

/**
 * A single placeholder, for the native build only.
 *
 * `output: 'export'` refuses a dynamic route with no params and refuses an
 * empty list too — "at least one route must be generated". Neither is
 * satisfiable here: the ids are user-generated, so the real list cannot be
 * known at build time.
 *
 * So this emits one shell nothing links to, purely to let the export finish.
 * The app reaches these screens through the query form instead
 * (`src/lib/navigation/links.ts`), which needs no file per record. The web
 * build ignores this entirely — there is a server there, and the path routes
 * stay fully dynamic for the pretty URLs that get shared.
 */
export function generateStaticParams() {
  return [{ id: '_' }];
}
