import { Bookmark } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Saved' };

export default function SavedPage() {
  return (
    <div className="px-safe pt-safe">
      <h1 className="px-5 pt-6 text-[1.75rem] font-semibold tracking-tight text-ink">Saved</h1>
      <EmptyState
        icon={<Bookmark className="size-7" aria-hidden />}
        title="Nothing saved yet"
        description="Places you save will live here. Favourites arrive in Phase 9."
      />
    </div>
  );
}
