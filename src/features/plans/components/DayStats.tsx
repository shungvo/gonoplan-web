'use client';

import { useLocale, useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import { formatTimeOfDay } from '../time';

/**
 * The day in three numbers: how many places, when it starts, when it ends.
 *
 * These were scattered — the count in a list card, the hours nowhere on the
 * plan itself. Together they answer the first thing anybody asks of a day
 * ("how much is in it, and how long is it?") before a single stop is read.
 *
 * Lifted onto the bottom edge of the cover so the two read as one object: the
 * picture says where, this says how much.
 */
export function DayStats({
  stopCount,
  startsAtMin,
  endsAtMin,
  className,
}: {
  stopCount: number;
  startsAtMin: number | null;
  endsAtMin: number | null;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();

  const time = (minutes: number | null) =>
    // A dash, not "not set": this is a figure in a row of figures, and an
    // empty day should look unfilled rather than broken.
    minutes === null ? '—' : formatTimeOfDay(minutes, locale);

  const stats = [
    { label: t('plan.stat.stops'), value: String(stopCount) },
    { label: t('plan.stat.start'), value: time(startsAtMin) },
    { label: t('plan.stat.end'), value: time(endsAtMin) },
  ];

  return (
    <dl
      className={cn(
        'bg-surface divide-border grid grid-cols-3 divide-x rounded-xl shadow-md',
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="px-2 py-3 text-center">
          <dt className="text-ink-subtle text-2xs font-semibold tracking-wide uppercase">
            {stat.label}
          </dt>
          <dd className="text-ink text-md mt-0.5 font-bold tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
