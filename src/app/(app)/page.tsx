import { Search } from 'lucide-react';
import { LocationChip } from '@/features/location/components/LocationChip';
import { ApiStatus } from '@/features/health/components/ApiStatus';
import { PlaceCardSkeleton } from '@/components/ui/Skeleton';

/**
 * Home (§14).
 *
 * Phase 1 renders the shell — greeting, location state, search affordance and
 * the recommendation rail — with the map and live data arriving in Phases 5-6.
 * Building the shell first means the mobile layout problems (safe areas, dvh,
 * nav clearance, scroll containment) are solved before a WebGL canvas is
 * competing for the same touch events.
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

      {/* Map placeholder — Phase 5 replaces this with the MapLibre canvas.
          Reserving the exact final height now keeps the layout from shifting
          when the map arrives. */}
      <section className="mt-5 px-5" aria-label="Map">
        <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary-tint via-surface to-accent-tint shadow-md">
          <p className="text-sm font-medium text-ink-subtle">Map · Phase 5</p>
        </div>
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

      <section className="mt-8 px-5" aria-label="System status">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
          Phase 1 · Setup
        </h2>
        <ApiStatus />
      </section>

      <div className="h-8" />
    </div>
  );
}
