import type { Metadata } from 'next';
import { TaxonomyScreen } from '@/features/admin/components/TaxonomyScreen';

export const metadata: Metadata = { title: 'Taxonomy · Admin' };

export default function TaxonomyPage() {
  return <TaxonomyScreen />;
}
