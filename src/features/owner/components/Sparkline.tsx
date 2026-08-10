import { cn } from '@/lib/utils/cn';

/**
 * A bar chart of daily activity.
 *
 * Bars rather than a line: the series is counts of discrete events on discrete
 * days, and a line implies interpolation between them that does not exist. At
 * this size the shape is the message — the exact numbers live in the totals
 * above it.
 */
export function Sparkline({
  data,
  className,
}: {
  data: Array<{ date: string; views: number }>;
  className?: string;
}) {
  const peak = Math.max(1, ...data.map((point) => point.views));
  const hasAnyActivity = data.some((point) => point.views > 0);

  if (!hasAnyActivity) {
    return (
      <p className={cn('text-ink-subtle py-6 text-center text-xs', className)}>
        No views recorded yet
      </p>
    );
  }

  return (
    <div className={cn('flex h-20 items-end gap-[2px]', className)} aria-hidden>
      {data.map((point) => (
        <span
          key={point.date}
          title={`${point.date}: ${String(point.views)} views`}
          className="bg-primary/70 min-h-[2px] flex-1 rounded-t-[2px]"
          style={{ height: `${String((point.views / peak) * 100)}%` }}
        />
      ))}
    </div>
  );
}
