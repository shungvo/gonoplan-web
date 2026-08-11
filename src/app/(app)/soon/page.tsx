import type { Metadata } from 'next';
import { SoonScreen } from '@/features/soon/SoonScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('nav.soon') };
}

export default function SoonPage() {
  return <SoonScreen />;
}
