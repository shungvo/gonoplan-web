'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useEnumLabel } from '@/i18n/useEnumLabel';
import { formatNumber, formatRating } from '@/i18n/format';
import { categoryName } from '@/features/categories/name';
import { Card, PageHeader, RowSkeleton, Stat, TimeAgo } from './primitives';
import { BarRow, Legend, SplitBar, StackedDayBars } from './charts';
import { TrendChart } from './TrendChart';
import { fetchAnalytics, fetchOverview, fetchSearchInsights } from '../api';

const WINDOWS = [7, 30, 90] as const;

/**
 * Where a place status sits on the "is this fine?" scale.
 *
 * Ordered as well as coloured: the split bar reads left to right as published
 * → waiting → never finished → refused, so the shape of the catalogue is
 * legible before any label is read.
 */
const STATUS_ORDER = ['APPROVED', 'PENDING', 'DRAFT', 'REJECTED', 'SUSPENDED', 'DELETED'] as const;

const STATUS_FILL: Record<string, string> = {
  APPROVED: 'bg-success',
  PENDING: 'bg-warning',
  DRAFT: 'bg-ink/25',
  REJECTED: 'bg-danger',
  SUSPENDED: 'bg-danger/45',
  DELETED: 'bg-ink/50',
};

/** Five stars in one gesture: the top two are good news, the bottom two are not. */
const RATING_FILL: Record<number, string> = {
  5: 'bg-success',
  4: 'bg-success/60',
  3: 'bg-warning',
  2: 'bg-danger/60',
  1: 'bg-danger',
};

export function OverviewScreen() {
  const t = useT();
  const locale = useLocale();
  const enumLabel = useEnumLabel();
  const [days, setDays] = useState<number>(30);

  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: fetchOverview });
  const analytics = useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: () => fetchAnalytics(days),
  });
  const demand = useQuery({
    queryKey: ['admin', 'search-insights'],
    queryFn: () => fetchSearchInsights(30),
  });

  const board = overview.data;
  const queues = board?.queues;
  const ages = board?.queueAges;
  const totals = board?.totals;
  const ratingPeak = Math.max(1, ...(board?.ratings ?? []).map((row) => row.reviews));

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
              oldest={ages?.places ?? null}
              href="/admin/moderation?tab=places"
            />
            <QueueCard
              label={t('overview.revisionsQueue')}
              value={queues.revisions}
              oldest={ages?.revisions ?? null}
              href="/admin/moderation?tab=revisions"
            />
            <QueueCard
              label={t('overview.ownersQueue')}
              value={queues.owners}
              oldest={ages?.owners ?? null}
              href="/admin/moderation?tab=owners"
            />
            <QueueCard
              label={t('overview.reportsQueue')}
              value={queues.reports}
              oldest={ages?.reports ?? null}
              href="/admin/moderation?tab=reports"
            />
          </div>

          {/*
            Five across only once there is room for five.

            At the `lg` breakpoint a fifth column puts each card at 134px, and
            "Người dùng hoạt động" over "đã đăng nhập tuần này" then wraps to
            four lines — the card grows taller than the queue cards above it
            while saying less. Three across until 1280px, where the container
            stops growing and five fit at a comfortable 230px.
          */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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

      {/*
        One window control for both time series.

        Arrivals and decisions are only worth putting side by side if they
        cover the same days, and a per-card window is an invitation to compare
        thirty days of submissions against seven days of moderation.
      */}
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-ink font-semibold">{t('overview.trends')}</h2>
        <div className="flex gap-2">
          {WINDOWS.map((window) => (
            <Chip
              key={window}
              selected={days === window}
              onClick={() => {
                setDays(window);
              }}
            >
              {t('overview.days', { count: window })}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-ink text-sm font-semibold">{t('overview.growth')}</h3>
          <p className="text-ink-subtle mt-0.5 mb-4 text-xs">{t('overview.growthHint')}</p>

          {analytics.isPending && (
            <div className="bg-surface-sunken h-48 animate-pulse rounded-md" />
          )}
          {analytics.data && <TrendChart data={analytics.data.daily} />}
        </Card>

        <Card>
          <h3 className="text-ink text-sm font-semibold">{t('overview.decisions')}</h3>
          <p className="text-ink-subtle mt-0.5 mb-4 text-xs">{t('overview.decisionsHint')}</p>

          {analytics.isPending && (
            <div className="bg-surface-sunken h-48 animate-pulse rounded-md" />
          )}
          {analytics.data && (
            <DecisionChart
              points={analytics.data.moderation}
              approvedLabel={t('chart.approved')}
              rejectedLabel={t('chart.rejected')}
            />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-ink text-sm font-semibold">{t('overview.catalogue')}</h3>
          <p className="text-ink-subtle mt-0.5 mb-4 text-xs">{t('overview.catalogueHint')}</p>

          {board && (
            <SplitBar
              segments={[...board.placesByStatus]
                .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                .map((row) => ({
                  key: row.status,
                  label: enumLabel('status', row.status),
                  value: row.places,
                  className: STATUS_FILL[row.status] ?? 'bg-ink/25',
                }))}
            />
          )}
        </Card>

        <Card>
          <h3 className="text-ink text-sm font-semibold">{t('overview.ratings')}</h3>
          <p className="text-ink-subtle mt-0.5 text-xs">{t('overview.ratingsHint')}</p>

          {board && totals !== undefined && totals.reviews === 0 && (
            <p className="text-ink-muted mt-4 text-sm">{t('overview.noReviews')}</p>
          )}

          {board && totals !== undefined && totals.reviews > 0 && (
            <ul className="mt-4 space-y-2.5">
              {[...board.ratings]
                // Five at the top: a histogram of a rating is read from the
                // best score down, the way the stars themselves are drawn.
                .reverse()
                .map((row) => (
                  <BarRow
                    key={row.rating}
                    label={`${formatNumber(row.rating, locale)}★`}
                    value={row.reviews}
                    peak={ratingPeak}
                    className={RATING_FILL[row.rating] ?? 'bg-primary'}
                  />
                ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-ink text-sm font-semibold">{t('overview.busiest')}</h3>
          <p className="text-ink-subtle mt-0.5 text-xs">{t('overview.busiestHint', { days })}</p>

          {analytics.data?.topPlaces.length === 0 && (
            <p className="text-ink-muted mt-4 text-sm">{t('overview.noViews')}</p>
          )}

          <ol className="mt-4 space-y-2.5">
            {analytics.data?.topPlaces.map((place, index) => (
              <li key={place.id} className="flex items-baseline gap-3">
                <span className="text-ink-subtle w-4 shrink-0 text-right text-xs tabular-nums">
                  {formatNumber(index + 1, locale)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/place/${place.slug}`}
                    className="text-ink hover:text-primary block truncate text-sm font-medium"
                  >
                    {place.name}
                  </Link>
                  {/* Saves and rating were in this payload from the start and
                      nothing read them. Views alone rank a place; whether
                      anyone kept it is the part that says why. */}
                  <p className="text-ink-subtle text-xs tabular-nums">
                    {t('overview.saveCount', { count: place.saves })}
                    {place.averageRating > 0 &&
                      ` · ${formatRating(place.averageRating, locale)}★`}
                  </p>
                </div>
                <span className="text-ink-muted shrink-0 text-xs tabular-nums">
                  {t('overview.viewCount', { count: place.views })}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h3 className="text-ink text-sm font-semibold">{t('overview.byCategory')}</h3>
          <p className="text-ink-subtle mt-0.5 text-xs">{t('overview.byCategoryHint')}</p>

          <ul className="mt-4 space-y-2.5">
            {board?.categories.slice(0, 8).map((category) => (
              <BarRow
                key={category.id}
                label={categoryName(category, locale)}
                value={category.places}
                peak={board.categories[0]?.places ?? 1}
                color={category.colorHex}
              />
            ))}
          </ul>
        </Card>
      </div>

      {/*
        The demand gap.

        `search_history` records every query and how many results it returned,
        and the zero-result ones are the most direct answer this screen can
        give to "what should we add next?". It lived one click away on the
        taxonomy screen; the number belongs where the operator starts.
      */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-ink text-sm font-semibold">{t('overview.demand')}</h3>
            <p className="text-ink-subtle mt-0.5 text-xs">{t('overview.demandHint')}</p>
          </div>
          {demand.data && demand.data.totals.searches > 0 && (
            <p className="text-warning text-2xl leading-none font-semibold tabular-nums">
              {t('overview.demandShare', {
                percent: Math.round(demand.data.totals.unmetShare * 100),
              })}
            </p>
          )}
        </div>

        {demand.data?.unmet.length === 0 && (
          <p className="text-ink-muted mt-4 text-sm">{t('overview.demandNone')}</p>
        )}

        {demand.data && demand.data.unmet.length > 0 && (
          <>
            <ul className="mt-4 flex flex-wrap gap-2">
              {demand.data.unmet.slice(0, 10).map((row) => (
                <li
                  key={row.query}
                  className="bg-surface-sunken text-ink flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
                >
                  {row.query}
                  <span className="text-ink-subtle text-xs tabular-nums">
                    {formatNumber(row.searches, locale)}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/admin/taxonomy"
              className="text-primary mt-4 inline-flex items-center gap-1 text-xs font-medium"
            >
              {t('overview.seeAllDemand')}
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </>
        )}
      </Card>
    </>
  );
}

/** Approved against rejected, per day, stacked so the column is "decided". */
function DecisionChart({
  points,
  approvedLabel,
  rejectedLabel,
}: {
  points: Array<{ date: string; approved: number; rejected: number }>;
  approvedLabel: string;
  rejectedLabel: string;
}) {
  const series = [
    { key: 'approved', label: approvedLabel, className: 'bg-success/80' },
    { key: 'rejected', label: rejectedLabel, className: 'bg-danger/70' },
  ];

  const total = (key: string) =>
    points.reduce((sum, point) => sum + (key === 'approved' ? point.approved : point.rejected), 0);

  return (
    <div>
      <div className="mb-4">
        <Legend items={series.map((item) => ({ ...item, value: total(item.key) }))} />
      </div>
      <StackedDayBars points={points} series={series} />
    </div>
  );
}

function QueueCard({
  label,
  value,
  oldest,
  href,
}: {
  label: string;
  value: number;
  /** When the oldest waiting item arrived, or null for an empty queue. */
  oldest: string | null;
  href: string;
}) {
  const t = useT();
  const locale = useLocale();
  const waiting = value > 0;

  return (
    <Link
      href={href}
      className="bg-surface group rounded-lg p-4 shadow-sm press-surface"
    >
      <p className="text-ink-subtle text-xs font-medium">{label}</p>
      <p
        className={`mt-1.5 text-2xl leading-none font-semibold tabular-nums ${
          waiting ? 'text-warning' : 'text-ink'
        }`}
      >
        {formatNumber(value, locale)}
      </p>

      {/*
        The age, not "Review now".

        The whole card is a link, so an instruction to click it said nothing.
        How long the oldest submission has been sitting there is the number
        that decides whether three waiting is fine or a problem.
      */}
      <p className="text-ink-subtle mt-1.5 flex items-center gap-1 text-xs">
        {waiting && oldest ? (
          <>
            {t('overview.oldest')} <TimeAgo iso={oldest} />
            <ArrowRight
              className="size-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </>
        ) : (
          t('overview.nothingWaiting')
        )}
      </p>
    </Link>
  );
}
