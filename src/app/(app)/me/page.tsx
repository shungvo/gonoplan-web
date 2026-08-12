import type { Metadata } from 'next';
import { MeScreen } from '@/features/checkins/components/MeScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('nav.me') };
}

export default function MePage() {
  return <MeScreen />;
}
