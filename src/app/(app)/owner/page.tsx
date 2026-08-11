import type { Metadata } from 'next';
import { OwnerScreen } from '@/features/owner/components/OwnerScreen';

import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('meta.owner') };
}

export default function OwnerPage() {
  return <OwnerScreen />;
}
