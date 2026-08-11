import type { Metadata } from 'next';
import { PlansScreen } from '@/features/plans/components/PlansScreen';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('plans.title') };
}

export default function PlanPage() {
  return <PlansScreen />;
}
