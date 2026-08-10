'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

type Series = 'users' | 'places' | 'reviews';

interface Point {
  date: string;
  users: number;
  places: number;
  reviews: number;
}

const SERIES: Array<{ key: Series; label: string; className: string }> = [
  { key: 'users', label: 'Signups', className: 'bg-primary/70' },
  { key: 'places', label: 'Submissions', className: 'bg-accent/70' },
  { key: 'reviews', label: 'Reviews', className: 'bg-success/70' },
];

/**
 * Daily counts, one series at a time.
 *
 * Bars rather than a line, for the same reason as the owner sparkline: these
 * are counts of discrete events on discrete days, and a line implies
 * interpolation between them that does not exist.
 *
 * One series at a time rather than three stacked or overlaid — reviews run an
 * order of magnitude above signups, so a shared axis flattens the smaller
 * series into a straight line at the bottom and hides exactly the movement an
 * operator is looking for.
 */
export function TrendChart({ data }: { data: Point[] }) {
  const [series, setSeries] = useState<Series>('users');

  const active = SERIES.find((item) => item.key === series) ?? SERIES[0];
  const values = data.map((point) => point[series]);
  const peak = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        {SERIES.map((item) => {
          const isActive = item.key === series;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSeries(item.key);
              }}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium transition-colors',
                isActive ? 'text-ink' : 'text-ink-subtle hover:text-ink-muted',
              )}
            >
              <span className={cn('size-2.5 rounded-full', item.className)} aria-hidden />
              {item.label}
            </button>
          );
        })}

        <span className="text-ink-muted ml-auto text-sm tabular-nums">
          {total.toLocaleString()} in {data.length} days
        </span>
      </div>

      <div className="flex h-40 items-end gap-[2px]">
        {data.map((point) => (
          <span
            key={point.date}
            title={`${point.date}: ${String(point[series])}`}
            className={cn('min-h-[2px] flex-1 rounded-t-[2px]', active?.className)}
            // A zero day still renders a 2px stub, so the axis reads as
            // "nothing happened" rather than "no data for this day".
            style={{ height: `${String((point[series] / peak) * 100)}%` }}
          />
        ))}
      </div>

      <div className="text-ink-subtle mt-2 flex justify-between text-xs tabular-nums">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
