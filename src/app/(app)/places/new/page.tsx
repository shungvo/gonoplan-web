import type { Metadata } from 'next';
import { SubmitPlaceScreen } from '@/features/places/components/SubmitPlaceScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return { title: t('meta.addPlace'), description: t('meta.addPlaceDescription') };
}

export default function AddPlacePage() {
  return <SubmitPlaceScreen />;
}
