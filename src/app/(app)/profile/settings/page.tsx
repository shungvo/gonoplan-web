import type { Metadata } from 'next';
import { AccountSettingsScreen } from '@/features/auth/components/AccountSettingsScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('profile.settingsTitle') };
}

export default function AccountSettingsPage() {
  return <AccountSettingsScreen />;
}
