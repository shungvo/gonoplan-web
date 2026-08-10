'use client';

import type { ReactNode } from 'react';
import { PlaceCard, PlaceCardSkeleton } from './PlaceCard';
import type { PlaceCard as PlaceCardDto } from '../api';
import { cn } from '@/lib/utils/cn';

export interface PlaceRailProps {
  title: string;
  places: PlaceCardDto[] | undefined;
  isPending: boolean;
  onSelect: (place: PlaceCardDto) => void;
  /** Shown beside the title, e.g. "within 15 km" after a widened search. */
  note?: string | undefined;
  emptyMessage?: string | undefined;
  action?: ReactNode | undefined;
  priority?: boolean | undefined;
  className?: string | undefined;
}

/**
 * A titled horizontal rail (§14).
 *
 * `overflow-x-auto` with snap alignment rather than a JS carousel: native
 * momentum scrolling is smoother than anything we would write, works with
 * screen readers and keyboards for free, and costs no JavaScript.
 */
export function PlaceRail({
  title,
  places,
  isPending,
  onSelect,
  note,
  emptyMessage = 'Nothing here yet.',
  action,
  priority = false,
  className,
}: PlaceRailProps) {
  const isEmpty = !isPending && (places?.length ?? 0) === 0;

  return (
    <section className={cn('', className)} aria-label={title}>
      <div className="flex items-baseline justify-between gap-3 px-5">
        <h2 className="text-ink text-lg font-semibold tracking-tight">{title}</h2>
        {note && <span className="text-ink-subtle shrink-0 text-xs font-medium">{note}</span>}
      </div>

      {isEmpty ? (
        <div className="bg-surface mx-5 mt-3 rounded-lg p-5 text-center shadow-sm">
          <p className="text-ink-muted text-sm">{emptyMessage}</p>
          {action && <div className="mt-3 flex justify-center">{action}</div>}
        </div>
      ) : (
        // `scroll-pl-5` must match `px-5`. Mandatory snapping aligns the first
        // card to the scrollport edge, not to the padded content edge — so on
        // load the rail silently scrolled itself 20px and every first card sat
        // flush against the screen while its own heading stayed inset. Scroll
        // padding moves the snap position instead of the card.
        <div className="mt-3 flex snap-x snap-mandatory scroll-pl-5 scrollbar-none gap-3 overflow-x-auto px-5 pb-1">
          {isPending
            ? Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="snap-start">
                  <PlaceCardSkeleton />
                </div>
              ))
            : places?.map((place, index) => (
                <div key={place.id} className="snap-start">
                  <PlaceCard place={place} onSelect={onSelect} priority={priority && index === 0} />
                </div>
              ))}
        </div>
      )}
    </section>
  );
}
