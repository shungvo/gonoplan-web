'use client';

import type { ReactNode } from 'react';
import { useLocale } from '@/i18n/I18nProvider';
import { useEnumLabel } from '@/i18n/useEnumLabel';
import { formatNumber, formatRelativeTime } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import { useNow } from '@/lib/utils/useNow';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-ink-muted mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('bg-surface rounded-lg p-5 shadow-sm', className)}>{children}</section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  const locale = useLocale();

  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm">
      <p className="text-ink-subtle text-xs font-medium">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-2xl leading-none font-semibold tabular-nums',
          tone === 'neutral' && 'text-ink',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
        )}
      >
        {typeof value === 'number' ? formatNumber(value, locale) : value}
      </p>
      {hint && <p className="text-ink-subtle mt-1 text-xs">{hint}</p>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  APPROVED: 'bg-success/10 text-success',
  PUBLISHED: 'bg-success/10 text-success',
  ACTIVE: 'bg-success/10 text-success',
  RESOLVED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/15 text-warning',
  OPEN: 'bg-warning/15 text-warning',
  REVIEWING: 'bg-warning/15 text-warning',
  DRAFT: 'bg-surface-sunken text-ink-muted',
  DISMISSED: 'bg-surface-sunken text-ink-muted',
  HIDDEN: 'bg-surface-sunken text-ink-muted',
  REJECTED: 'bg-danger/10 text-danger',
  SUSPENDED: 'bg-danger/10 text-danger',
  BANNED: 'bg-danger/10 text-danger',
  DELETED: 'bg-danger/10 text-danger',
};

export function StatusBadge({ status }: { status: string }) {
  const label = useEnumLabel();

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
        STATUS_TONE[status] ?? 'bg-surface-sunken text-ink-muted',
      )}
    >
      {label('status', status)}
    </span>
  );
}

/**
 * Relative time, in whole units.
 *
 * "4 days ago" is what a moderator triaging a queue actually reads; the exact
 * timestamp is in the title attribute for the rare case it matters.
 *
 * The clock comes from `useNow`, not from `Date.now()` in the render body: the
 * server's clock and the browser's differ, so rendering "3 minutes ago" and
 * hydrating "2 minutes ago" over it is a mismatch. Server-side `now` is 0 and
 * the plain date shows — derived from the string itself, so both sides agree.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const then = new Date(iso);
  const now = useNow();
  const locale = useLocale();

  if (now === 0) {
    return (
      <time dateTime={iso} className="text-ink-subtle text-xs">
        {iso.slice(0, 10)}
      </time>
    );
  }

  return (
    <time
      dateTime={iso}
      title={then.toLocaleString(locale)}
      className="text-ink-subtle text-xs"
    >
      {formatRelativeTime(then, now, locale)}
    </time>
  );
}

export function QueueEmpty({ label }: { label: string }) {
  return (
    <div className="border-border text-ink-muted rounded-lg border border-dashed py-12 text-center text-sm">
      {label}
    </div>
  );
}

export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="bg-surface h-24 animate-pulse rounded-lg shadow-sm" />
      ))}
    </div>
  );
}
