'use client';

import { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PlaceDetail } from '../api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Hour = PlaceDetail['openingHours'][number];

/**
 * Opening hours, today first and collapsed by default.
 *
 * People ask "is it open now?" far more often than "what are Thursday's
 * hours?", so today's line answers that question without expanding, and the
 * full week is one tap away rather than seven rows of noise.
 */
export function OpeningHours({
  hours,
  isOpenNow,
  timezone,
}: {
  hours: Hour[];
  isOpenNow: boolean;
  timezone: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (hours.length === 0) {
    return (
      <p className="text-ink-muted flex items-center gap-2 text-sm">
        <Clock className="text-ink-subtle size-4 shrink-0" aria-hidden />
        Opening hours not listed yet
      </p>
    );
  }

  // Derived from the place's own timezone, not the device's — someone in
  // London planning a trip to Da Nang must see Da Nang's today.
  const todayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date());
  const todayIndex = Math.max(
    0,
    DAY_NAMES.findIndex((day) => day.startsWith(todayShort)),
  );

  const byDay = new Map<number, Hour[]>();
  for (const hour of hours) {
    byDay.set(hour.dayOfWeek, [...(byDay.get(hour.dayOfWeek) ?? []), hour]);
  }

  const describe = (day: number): string => {
    const shifts = byDay.get(day);
    if (!shifts || shifts.length === 0) return 'Closed';
    if (shifts.every((shift) => shift.isClosed)) return 'Closed';

    return shifts
      .filter((shift) => !shift.isClosed)
      .map((shift) =>
        // 1440 minutes formats back to "00:00", so a full day arrives as
        // 00:00–00:00 rather than 00:00–24:00.
        shift.opensAt === '00:00' && shift.closesAt === '00:00'
          ? 'Open 24 hours'
          : `${shift.opensAt} – ${shift.closesAt}`,
      )
      .join(', ');
  };

  // Rotated so today is first; scanning starts where the user is.
  const orderedDays = Array.from({ length: 7 }, (_, offset) => (todayIndex + offset) % 7);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setExpanded((open) => !open);
        }}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <Clock className="text-ink-subtle size-4 shrink-0" aria-hidden />
        <span className={cn('text-sm font-semibold', isOpenNow ? 'text-success' : 'text-danger')}>
          {isOpenNow ? 'Open now' : 'Closed'}
        </span>
        <span className="text-ink-muted truncate text-sm">· {describe(todayIndex)}</span>
        <ChevronDown
          className={cn(
            'text-ink-subtle ml-auto size-4 shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {expanded && (
        <dl className="border-border mt-3 space-y-1.5 border-t pt-3">
          {orderedDays.map((day) => (
            <div key={day} className="flex items-baseline justify-between gap-4 text-sm">
              <dt className={cn(day === todayIndex ? 'text-ink font-semibold' : 'text-ink-muted')}>
                {DAY_NAMES[day]}
              </dt>
              <dd
                className={cn(
                  'text-right tabular-nums',
                  day === todayIndex ? 'text-ink font-semibold' : 'text-ink-muted',
                )}
              >
                {describe(day)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
