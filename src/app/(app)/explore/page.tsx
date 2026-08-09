import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Explore' };

export default function ExplorePage() {
  return (
    <div className="px-safe pt-safe">
      <h1 className="px-5 pt-6 text-[1.75rem] font-semibold tracking-tight text-ink">Explore</h1>
      <EmptyState
        icon={<Compass className="size-7" aria-hidden />}
        title="Nothing to explore yet"
        description="Search, filters and category browsing arrive in Phase 7."
      />
    </div>
  );
}
