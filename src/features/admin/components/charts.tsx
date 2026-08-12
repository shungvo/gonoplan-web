'use client';

import type { ReactNode } from 'react';
import { useLocale } from '@/i18n/I18nProvider';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';

/**
 * The chart vocabulary for the admin overview.
 *
 * Three shapes, deliberately: days down a column, a whole split into parts,
 * and a ranked list of magnitudes. Every number on that screen is one of those
 * three, and a fourth idiom would be a fourth thing to learn to read.
 *
 * No charting library. These are bars — a `div` with a width or a height — and
 * a dependency that ships an SVG renderer and its own layout engine to draw
 * rectangles costs more than it explains.
 */

/**
 * One column per day, split into stacked segments.
 *
 * Stacking is only honest when the parts sum to something real. Approved and
 * rejected sum to "decided today", which is a number an operator wants; users,
 * places and reviews do not sum to anything, which is why the growth chart
 * shows one series at a time instead.
 */
export function StackedDayBars({
  points,
  series,
  height = 'h-40',
}: {
  points: Array<{ date: string } & Record<string, number | string>>;
  series: Array<{ key: string; label: string; className: string }>;
  height?: string;
}) {
  const totals = points.map((point) =>
    series.reduce((sum, item) => sum + Number(point[item.key] ?? 0), 0),
  );
  const peak = Math.max(1, ...totals);

  return (
    <div>
      <div className={cn('flex items-end gap-[2px]', height)}>
        {points.map((point, index) => {
          const total = totals[index] ?? 0;

          return (
            <div
              key={point.date}
              title={`${point.date}: ${series
                .map((item) => `${item.label} ${String(point[item.key] ?? 0)}`)
                .join(', ')}`}
              className="flex h-full flex-1 flex-col justify-end"
            >
              {/* Empty days still take their slot, so a gap in the middle of
                  the window reads as a quiet day rather than a missing one. */}
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-[2px]"
                style={{ height: `${String((total / peak) * 100)}%` }}
              >
                {series.map((item) => {
                  const value = Number(point[item.key] ?? 0);
                  if (value === 0) return null;

                  return (
                    <span
                      key={item.key}
                      className={cn('w-full', item.className)}
                      style={{ height: `${String((value / Math.max(1, total)) * 100)}%` }}
                    />
                  );
                })}
              </div>
              {total === 0 && <span className="bg-border h-[2px] w-full rounded-full" />}
            </div>
          );
        })}
      </div>

      {/* Only the two dates. A bare total sitting between them read as a third
          axis label — the legend above already carries every number, split by
          series, which is the form anyone would actually want it in. */}
      <div className="text-ink-subtle mt-2 flex justify-between text-xs tabular-nums">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: Array<{ label: string; className: string; value?: number }>;
}) {
  const locale = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="text-ink-muted flex items-center gap-1.5 text-xs">
          <span className={cn('size-2.5 shrink-0 rounded-full', item.className)} aria-hidden />
          {item.label}
          {item.value !== undefined && (
            <span className="text-ink font-medium tabular-nums">
              {formatNumber(item.value, locale)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * A whole, split into its parts, on one bar.
 *
 * For a breakdown whose parts are a composition rather than a ranking — the
 * catalogue is 80% published and 4% rejected, and what matters is the
 * proportion, not which slice is longest. A row of separate bars would say the
 * opposite.
 *
 * Segments below a couple of percent still get a visible sliver: "almost none"
 * and "none" are different answers, and only one of them means there is
 * nothing to look at.
 */
export function SplitBar({
  segments,
}: {
  segments: Array<{ key: string; label: string; value: number; className: string }>;
}) {
  const locale = useLocale();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const present = segments.filter((segment) => segment.value > 0);

  if (total === 0) return null;

  return (
    <div>
      <div
        className="bg-surface-sunken flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={present
          .map((segment) => `${segment.label}: ${formatNumber(segment.value, locale)}`)
          .join(', ')}
      >
        {present.map((segment) => (
          <span
            key={segment.key}
            title={`${segment.label}: ${formatNumber(segment.value, locale)}`}
            className={cn('h-full', segment.className)}
            style={{ width: `${String(Math.max(1.5, (segment.value / total) * 100))}%` }}
          />
        ))}
      </div>

      <div className="mt-3">
        <Legend
          items={present.map((segment) => ({
            label: segment.label,
            className: segment.className,
            value: segment.value,
          }))}
        />
      </div>
    </div>
  );
}

/**
 * A label, a magnitude and a number — the shape every ranked list on this
 * screen already used, extracted so the category mix and the rating histogram
 * stop being two hand-rolled copies that drift.
 *
 * Scaled against the largest row rather than the total: this is a comparison
 * between rows, and against a total the top bar in a long tail is a stub.
 */
export function BarRow({
  label,
  value,
  peak,
  className,
  color,
}: {
  label: ReactNode;
  value: number;
  peak: number;
  className?: string;
  /** For bars whose colour is data rather than design — a category's own hex. */
  color?: string;
}) {
  const locale = useLocale();

  return (
    <li className="flex items-center gap-3">
      <span className="text-ink w-28 shrink-0 truncate text-sm">{label}</span>
      <span className="bg-surface-sunken h-2 flex-1 overflow-hidden rounded-full">
        <span
          className={cn('block h-full rounded-full', className)}
          style={{
            // Zero is drawn as nothing at all; every non-zero row keeps a 2%
            // stub so "one" is visible next to "four hundred".
            width: `${String(value === 0 ? 0 : Math.max(2, (value / peak) * 100))}%`,
            ...(color ? { backgroundColor: color } : {}),
          }}
        />
      </span>
      <span className="text-ink-muted w-10 shrink-0 text-right text-xs tabular-nums">
        {formatNumber(value, locale)}
      </span>
    </li>
  );
}
