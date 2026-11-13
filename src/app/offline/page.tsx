import type { Metadata } from 'next';
import { OfflineScreen } from '@/features/pwa/components/OfflineScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('pwa.offline.title'), robots: { index: false } };
}

/**
 * Outside the route groups on purpose: no bottom nav, no session, no data.
 * It has to render from the cache alone, so it depends on nothing that could
 * itself need the network.
 */
export default function OfflinePage() {
  return <OfflineScreen />;
}
