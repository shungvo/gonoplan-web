import type { Metadata } from 'next';
import { SavedScreen } from '@/features/favorites/components/SavedScreen';

import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('meta.saved') };
}

export default function SavedPage() {
  return <SavedScreen />;
}
