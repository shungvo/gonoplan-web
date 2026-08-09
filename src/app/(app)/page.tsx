import { Search } from 'lucide-react';
import { LocationChip } from '@/features/location/components/LocationChip';
import { HomeMap } from '@/features/map/components/HomeMap';
import { PlaceCardSkeleton } from '@/components/ui/Skeleton';

/**
 * Home (§14).
 *
 * The map is now real. Recommendation rails arrive in Phase 12; their skeletons
 * stay so the layout is already the final one and nothing shifts when data
 * lands.
 */
export default function HomePage() {
  return (
    <div className="px-safe">
      <header className="px-5 pt-safe">
        <div className="flex items-start justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">Good evening 👋</p>
            <h1 className="mt-1 text-[1.75rem] leading-tight font-semibold tracking-tight text-ink">
              Where to today?
            </h1>
          </div>
        </div>

        <div className="mt-3">
          <LocationChip />
        </div>

        <button
          type="button"
          className="mt-4 flex h-13 w-full items-center gap-3 rounded-lg bg-surface px-4 text-left shadow-md transition-transform active:scale-[0.99]"
        >
          <Search className="size-5 shrink-0 text-ink-subtle" aria-hidden />
          <span className="text-[0.9375rem] text-ink-subtle">Where do you want to go?</span>
        </button>
      </header>

      <section className="mt-5 px-5" aria-label="Map">
        {/* A fixed height reserved up front: the map mounts asynchronously, and
            letting it size itself would shift everything below it on load. */}
        <HomeMap className="h-72" />
      </section>

      <section className="mt-7" aria-label="Popular near you">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Popular near you</h2>
          <span className="text-sm font-medium text-ink-subtle">Phase 12</span>
        </div>
        <div className="scrollbar-none mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}
