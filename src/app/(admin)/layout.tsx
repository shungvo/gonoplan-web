import type { Metadata } from 'next';
import { AdminShell } from '@/features/admin/components/AdminShell';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return {
    title: t('meta.admin'),
    // Nothing here should ever be indexed, even though every route is behind
    // an authenticated API — a crawled URL is still an invitation to probe it.
    robots: { index: false, follow: false },
  };
}

/**
 * The admin route group.
 *
 * Deliberately not nested in `(app)`: that layout is the phone shell — bottom
 * navigation, `h-dvh` frame, safe-area padding. Moderation is desktop work
 * (§40), and inheriting the mobile chrome would put a tab bar under a data
 * table.
 */
export default function AdminLayout({ children }: LayoutProps<'/'>) {
  return <AdminShell>{children}</AdminShell>;
}
