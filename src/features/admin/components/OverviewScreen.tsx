'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import { Card, PageHeader, RowSkeleton, Stat } from './primitives';
import { TrendChart } from './TrendChart';
import { fetchAnalytics, fetchOverview } from '../api';

const WINDOWS = [7, 30, 90] as const;

export function OverviewScreen() {
  const [days, setDays] = useState<number>(30);

  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: fetchOverview });
  const analytics = useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: () => fetchAnalytics(days),
  });

  const queues = overview.data?.queues;
  const totals = overview.data?.totals;

  return (
    <>
      <PageHeader title="Overview" description="Queue depths first — everything else is context." />

      {overview.isPending && <RowSkeleton rows={2} />}

      {queues && totals && (
        <>
          {/* Queues lead. A dashboard that opens on total signups buries the
              only numbers that represent work waiting on a person. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <QueueCard
              label="Places to review"
              value={queues.places}
              href="/admin/moderation?tab=places"
            />
            <QueueCard
              label="Edits to review"
              value={queues.revisions}
              href="/admin/moderation?tab=revisions"
            />
            <QueueCard
              label="Businesses to verify"
              value={queues.owners}
              href="/admin/moderation?tab=owners"
            />
            <QueueCard
              label="Open reports"
              value={queues.reports}
              href="/admin/moderation?tab=reports"
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Users" value={totals.users} hint={`+${totals.newUsers} in 7 days`} />
            <Stat label="Active users" value={totals.activeUsers} hint="signed in this week" />
            <Stat
              label="Published places"
              value={totals.publishedPlaces}
              hint={`${totals.places.toLocaleString()} total`}
            />
            <Stat label="Reviews" value={totals.reviews} hint={`+${totals.newReviews} in 7 days`} />
          </div>
        </>
      )}

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-ink font-semibold">Growth</h2>
          <div className="flex gap-2">
            {WINDOWS.map((window) => (
              <Chip
                key={window}
                selected={days === window}
                onClick={() => {
                  setDays(window);
                }}
              >
                {window}d
              </Chip>
            ))}
          </div>
        </div>

        {analytics.isPending && <div className="bg-surface-sunken h-48 animate-pulse rounded-md" />}
        {analytics.data && <TrendChart data={analytics.data.daily} />}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-ink font-semibold">Busiest places</h2>
          <p className="text-ink-subtle mt-0.5 text-xs">By views over the last {days} days</p>

          {analytics.data?.topPlaces.length === 0 && (
            <p className="text-ink-muted mt-4 text-sm">No recorded views in this window yet.</p>
          )}

          <ol className="mt-4 space-y-2.5">
            {analytics.data?.topPlaces.map((place, index) => (
              <li key={place.id} className="flex items-center gap-3">
                <span className="text-ink-subtle w-4 text-right text-xs tabular-nums">
                  {index + 1}
                </span>
                <Link
                  href={`/place/${place.slug}`}
                  className="text-ink hover:text-primary min-w-0 flex-1 truncate text-sm font-medium"
                >
                  {place.name}
                </Link>
                <span className="text-ink-muted shrink-0 text-xs tabular-nums">
                  {place.views.toLocaleString()} views
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="text-ink font-semibold">Published by category</h2>

          <ul className="mt-4 space-y-2.5">
            {overview.data?.categories.slice(0, 8).map((category) => {
              const max = overview.data.categories[0]?.places ?? 1;

              return (
                <li key={category.id} className="flex items-center gap-3">
                  <span className="text-ink w-32 shrink-0 truncate text-sm">{category.name}</span>
                  <span className="bg-surface-sunken h-2 flex-1 overflow-hidden rounded-full">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${String(Math.max(2, (category.places / max) * 100))}%`,
                        backgroundColor: category.colorHex,
                      }}
                    />
                  </span>
                  <span className="text-ink-muted w-8 shrink-0 text-right text-xs tabular-nums">
                    {category.places}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}

function QueueCard({ label, value, href }: { label: string; value: number; href: string }) {
  const waiting = value > 0;

  return (
    <Link
      href={href}
      className="bg-surface group rounded-lg p-4 shadow-sm transition-transform active:scale-[0.99]"
    >
      <p className="text-ink-subtle text-xs font-medium">{label}</p>
      <p
        className={`mt-1.5 text-2xl leading-none font-semibold tabular-nums ${
          waiting ? 'text-warning' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="text-ink-subtle mt-1.5 flex items-center gap-1 text-xs">
        {waiting ? 'Review now' : 'Nothing waiting'}
        {waiting && (
          <ArrowRight
            className="size-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        )}
      </p>
    </Link>
  );
}
