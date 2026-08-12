import { PublicProfileScreen } from '@/features/users/components/PublicProfileScreen';

export default async function UserPage({ params }: PageProps<'/u/[id]'>) {
  const { id } = await params;
  return <PublicProfileScreen userId={id} />;
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
