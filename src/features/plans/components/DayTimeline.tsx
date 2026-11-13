'use client';

import type { ReactNode } from 'react';
import { categorySolid } from '@/features/categories/color';
import { cn } from '@/lib/utils/cn';
import { gapBetween } from '../time';
import type { PlanStop } from '../api';
import { TravelGap } from './TravelGap';

/**
 * The stops, as a route.
 *
 * A plan is an *order* — that is the whole point of one — and a stack of cards
 * only implies it. A numbered marker with a line running through it states it,
 * and gives the travel time somewhere to live that reads as "between these
 * two" rather than as another row in the list.
 *
 * Each marker takes its stop's category colour, the same one on the map pin
 * and the pill in the card. Scanning down the rail then reads as the shape of
 * the day — coffee, museum, lunch, bar — before a single name is read.
 *
 * Shared by the owner's editor and the public page; what goes *in* a stop
 * differs between them, so that is the caller's to render.
 */
export function DayTimeline({
  stops,
  renderStop,
  after,
}: {
  stops: PlanStop[];
  renderStop: (stop: PlanStop, index: number) => ReactNode;
  /**
   * A last node on the rail that is not a stop — the editor's "add a place".
   * The line runs on into it, so adding reads as extending the route.
   */
  after?: ReactNode;
}) {
  return (
    <ol>
      {stops.map((stop, index) => {
        const previous = index > 0 ? stops[index - 1] : undefined;
        const isLast = index === stops.length - 1;
        // Only measured when both ends are real places with coordinates worth
        // routing between.
        const measurable =
          previous !== undefined && !previous.place.isUnavailable && !stop.place.isUnavailable;

        return (
          <li key={stop.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
            {/* The hop from the stop above, on its own row so the marker below
                lines up with the top of its card rather than with the gap. */}
            {previous !== undefined && (
              <>
                <Rail />
                {measurable ? (
                  <TravelGap
                    from={{
                      latitude: previous.place.latitude,
                      longitude: previous.place.longitude,
                    }}
                    to={{ latitude: stop.place.latitude, longitude: stop.place.longitude }}
                    allowedMinutes={gapBetween(
                      previous.endsAtMin ?? previous.startsAtMin,
                      stop.startsAtMin,
                    )}
                  />
                ) : (
                  <span className="h-3" />
                )}
              </>
            )}

            <Rail
              // The line stops at the last marker unless something follows it.
              start={index === 0 ? 'marker' : 'top'}
              end={isLast && after === undefined ? 'marker' : 'bottom'}
            >
              <span
                className="text-2xs relative mt-3.5 flex size-8 items-center justify-center rounded-full font-bold text-white tabular-nums shadow-sm ring-4 ring-[var(--rail-ground)]"
                style={{ backgroundColor: categorySolid(stop.place.category.colorHex) }}
                aria-hidden
              >
                {index + 1}
              </span>
            </Rail>

            <div className="min-w-0 pb-1">{renderStop(stop, index)}</div>
          </li>
        );
      })}

      {after !== undefined && (
        <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
          {stops.length > 0 && (
            <>
              <Rail />
              <span className="h-3" />
            </>
          )}
          {after}
        </li>
      )}
    </ol>
  );
}

/**
 * One cell of the rail: the line, and whatever sits on it.
 *
 * `start` and `end` say where the line runs within the cell. The marker is
 * 32px tall and starts 14px down, so its centre is 30px from the top — the
 * line is drawn to or from that point when it has to end on a marker.
 */
export function Rail({
  children,
  start = 'top',
  end = 'bottom',
}: {
  children?: ReactNode;
  start?: 'top' | 'marker';
  end?: 'bottom' | 'marker';
}) {
  return (
    <div className="relative flex justify-center">
      <span
        className={cn(
          'bg-border absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full',
          start === 'top' ? 'top-0' : 'top-[1.875rem]',
          end === 'bottom' ? 'bottom-0' : 'bottom-[calc(100%-1.875rem)]',
        )}
        aria-hidden
      />
      {children}
    </div>
  );
}
