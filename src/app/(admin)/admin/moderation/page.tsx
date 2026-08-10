import { Suspense } from 'react';
import { ModerationScreen } from '@/features/admin/components/ModerationScreen';

export default function AdminModerationPage() {
  // `useSearchParams` needs a Suspense boundary, or the whole route opts out
  // of static rendering at build time.
  return (
    <Suspense fallback={<div className="bg-surface h-64 animate-pulse rounded-lg" />}>
      <ModerationScreen />
    </Suspense>
  );
}
