'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber } from '@/i18n/format';
import { Card, PageHeader, RowSkeleton, Stat } from './primitives';
import { TrendChart } from './TrendChart';
import { fetchAnalytics, fetchOverview } from '../api';

const WINDOWS = [7, 30, 90] as const;

export function OverviewScreen() {
  const t = useT();
  const locale = useLocale();
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
      <PageHeader title={t('admin.overview')} description={t('overview.description')} />

      {overview.isPending && <RowSkeleton rows={2} />}

      {queues && totals && (
        <>
          {/* Queues lead. A dashboard that opens on total signups buries the
              only numbers that represent work waiting on a person. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <QueueCard
              label={t('overview.placesQueue')}
              value={queues.places}
              href="/admin/moderation?tab=places"
            />
            <QueueCard
              label={t('overview.revisionsQueue')}
              value={queues.revisions}
              href="/admin/moderation?tab=revisions"
            />
            <QueueCard
              label={t('overview.ownersQueue')}
              value={queues.owners}
              href="/admin/moderation?tab=owners"
            />
            <QueueCard
              label={t('overview.reportsQueue')}
              value={queues.reports}
              href="/admin/moderation?tab=reports"
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label={t('overview.users')}
              value={totals.users}
              hint={t('overview.inSevenDays', { count: totals.newUsers })}
            />
            <Stat
              label={t('overview.activeUsers')}
              value={totals.activeUsers}
              hint={t('overview.signedInThisWeek')}
            />
            <Stat
              label={t('overview.publishedPlaces')}
              value={totals.publishedPlaces}
              hint={t('overview.totalPlaces', { count: totals.places })}
            />
            <Stat
              label={t('overview.reviews')}
              value={totals.reviews}
              hint={t('overview.inSevenDays', { count: totals.newReviews })}
            />
            {/* Counted, never opened. A plan has no public surface, so there is
                nothing on one to moderate — and no reason this screen should
                be able to read somebody's day. */}
            <Stat
              label={t('overview.plans')}
              value={totals.plans}
              hint={t('overview.plansHint')}
            />
          </div>
        </>
      )}

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-ink font-semibold">{t('overview.growth')}</h2>
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
          <h2 className="text-ink font-semibold">{t('overview.busiest')}</h2>
          <p className="text-ink-subtle mt-0.5 text-xs">{t('overview.busiestHint', { days })}</p>

          {analytics.data?.topPlaces.length === 0 && (
            <p className="text-ink-muted mt-4 text-sm">{t('overview.noViews')}</p>
          )}

          <ol className="mt-4 space-y-2.5">
            {analytics.data?.topPlaces.map((place, index) => (
              <li key={place.id} className="flex items-center gap-3">
                <span className="text-ink-subtle w-4 text-right text-xs tabular-nums">
                  {formatNumber(index + 1, locale)}
                </span>
                <Link
                  href={`/place/${place.slug}`}
                  className="text-ink hover:text-primary min-w-0 flex-1 truncate text-sm font-medium"
                >
                  {place.name}
                </Link>
                <span className="text-ink-muted shrink-0 text-xs tabular-nums">
                  {t('overview.viewCount', { count: place.views })}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="text-ink font-semibold">{t('overview.byCategory')}</h2>

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
                    {formatNumber(category.places, locale)}
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
  const t = useT();
  const locale = useLocale();
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
        {formatNumber(value, locale)}
      </p>
      <p className="text-ink-subtle mt-1.5 flex items-center gap-1 text-xs">
        {waiting ? t('overview.reviewNow') : t('overview.nothingWaiting')}
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
