import type { Metadata } from 'next';
import { SearchScreen } from '@/features/search/components/SearchScreen';

import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('meta.search') };
}

export default function SearchPage() {
  return <SearchScreen />;
}
