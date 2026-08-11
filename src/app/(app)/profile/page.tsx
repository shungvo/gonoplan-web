import type { Metadata } from 'next';
import { ProfileScreen } from '@/features/auth/components/ProfileScreen';

import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('meta.profile') };
}

export default function ProfilePage() {
  return <ProfileScreen />;
}
