'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Plus,
  Share2,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fieldClass } from '@/components/ui/field';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { categoryName } from '@/features/categories/name';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import {
  usePlan,
  useRemoveStop,
  useReorderStops,
  useUpdatePlan,
  useUpdateStop,
} from '../hooks/usePlans';
import { formatTimeOfDay, gapBetween, parseTimeInput, toTimeInput } from '../time';
import type { PlanStop } from '../api';
import { TravelGap } from './TravelGap';
import { AddStopSheet } from './AddStopSheet';
import { SharePlanSheet } from './SharePlanSheet';

/**
 * One day, in order.
 *
 * Reordering is two buttons rather than a drag handle. A drag list inside a
 * scrolling page on a phone has to win a fight with the scroll on every touch,
 * and the arrows are reachable one-handed, work with a keyboard and a screen
 * reader, and cannot be started by accident while reading.
 */
export function PlanEditorScreen({ planId }: { planId: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const describeError = useErrorMessage();

  const plan = usePlan(planId);
  const reorder = useReorderStops(planId);
  const updatePlan = useUpdatePlan(planId);

  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingDate, setEditingDate] = useState(false);

  const stops = plan.data?.stops ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const next = [...stops];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next.map((stop) => stop.id));
  };

  if (plan.isPending) {
    return (
      <div className="px-safe px-5 pt-safe">
        <div className="bg-surface-sunken mt-6 h-8 w-2/3 animate-pulse rounded" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="bg-surface h-24 animate-pulse rounded-lg shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (plan.error != null || !plan.data) {
    return (
      <div className="px-safe px-5 pt-safe">
        <EmptyState
          className="pt-20"
          title={describeError(plan.error)}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                router.push('/plan');
              }}
            >
              {t('plan.back')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-safe pb-10">
      <header className="pt-safe-float px-5">
        <button
          type="button"
          onClick={() => {
            router.push('/plan');
          }}
          aria-label={t('plan.back')}
          className="text-ink -ml-2 flex size-10 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>

        {/* The title edits in place. A day gets renamed as it takes shape —
            "Sunday" becomes "Sunday, District 1 coffee" — and sending someone
            to a settings screen for that loses the thought. */}
        <input
          value={plan.data.title}
          onChange={(event) => {
            updatePlan.mutate({ title: event.target.value.slice(0, 120) });
          }}
          aria-label={t('plans.titleLabel')}
          className="text-ink mt-1 w-full bg-transparent text-[1.75rem] leading-tight font-semibold tracking-tight outline-none"
        />

        {editingDate ? (
          <input
            type="date"
            autoFocus
            value={plan.data.date ?? ''}
            onChange={(event) => {
              updatePlan.mutate({ date: event.target.value || null });
            }}
            onBlur={() => {
              setEditingDate(false);
            }}
            className={fieldClass('mt-2 h-10 px-3 text-sm')}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingDate(true);
            }}
            className="text-ink-muted mt-1 inline-flex items-center gap-1.5 text-sm"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {plan.data.date ? formatDate(plan.data.date, locale) : t('plans.noDate')}
          </button>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            fullWidth
            leadingIcon={<Plus className="size-4" aria-hidden />}
            onClick={() => {
              setAdding(true);
            }}
          >
            {t('plan.addPlace')}
          </Button>
          <Button
            variant="secondary"
            aria-label={t('plan.share')}
            disabled={stops.length === 0}
            onClick={() => {
              setSharing(true);
            }}
            className="px-4"
          >
            <Share2 className="size-[1.125rem]" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="mt-5 px-5">
        {stops.length === 0 ? (
          <EmptyState
            icon={<MapPin className="size-7" aria-hidden />}
            title={t('plan.emptyTitle')}
            description={t('plan.emptyBody')}
          />
        ) : (
          <ol>
            {stops.map((stop, index) => {
              const previous = index > 0 ? stops[index - 1] : undefined;

              return (
                <li key={stop.id}>
                  {/* The hop from the stop above. Only drawn when both ends
                      have coordinates to measure between. */}
                  {previous && !previous.place.isUnavailable && !stop.place.isUnavailable && (
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
                  )}

                  <StopCard
                    planId={planId}
                    stop={stop}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === stops.length - 1}
                    onMove={move}
                  />
                </li>
              );
            })}
          </ol>
        )}

        {reorder.error != null && (
          <p role="alert" className="bg-danger/10 text-danger mt-4 rounded-md p-3 text-sm">
            {/* A 409 here means the plan moved under us — another tab, another
                device. Reloading is the only honest fix. */}
            {t('plan.reloadNeeded')}
          </p>
        )}
      </div>

      <AddStopSheet
        planId={planId}
        open={adding}
        onOpenChange={setAdding}
        existingPlaceIds={stops.map((stop) => stop.place.id)}
      />
      <SharePlanSheet plan={plan.data} open={sharing} onOpenChange={setSharing} />
    </div>
  );
}

function StopCard({
  planId,
  stop,
  index,
  isFirst,
  isLast,
  onMove,
}: {
  planId: string;
  stop: PlanStop;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const updateStop = useUpdateStop(planId);
  const removeStop = useRemoveStop(planId);
  const [editingTime, setEditingTime] = useState(false);

  const setTime = (field: 'startsAtMin' | 'endsAtMin', value: string) => {
    updateStop.mutate({
      stopId: stop.id,
      [field]: value === '' ? null : parseTimeInput(value),
    });
  };

  return (
    <div className="bg-surface flex gap-3 rounded-lg p-3 shadow-sm">
      <div className="bg-surface-sunken relative size-14 shrink-0 overflow-hidden rounded-md">
        <PlaceImage
          url={stop.place.coverImageUrl}
          blurhash={stop.place.coverBlurhash}
          name={stop.place.name}
          categorySlug={stop.place.category.slug}
          categoryColor={stop.place.category.colorHex}
          sizes="56px"
          fallbackSize="sm"
        />
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/place/${stop.place.slug}`}
          className="text-primary block truncate text-[0.9375rem] font-semibold"
        >
          {stop.place.name}
        </Link>
        <p className="text-ink-subtle mt-0.5 truncate text-xs">
          {categoryName(stop.place.category, locale)} ·{' '}
          {stop.place.district ?? stop.place.province}
        </p>

        {/* Stated, never hidden. A stop that vanished from a day somebody
            arranged, with nothing to explain it, is the worse outcome. */}
        {stop.place.isUnavailable && (
          <p className="text-danger mt-1 flex items-center gap-1 text-xs">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
            {t('plan.unavailable')}
          </p>
        )}

        {editingTime ? (
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-subtle">{t('plan.from')}</span>
              <input
                type="time"
                autoFocus
                value={toTimeInput(stop.startsAtMin)}
                onChange={(event) => {
                  setTime('startsAtMin', event.target.value);
                }}
                className={fieldClass('h-9 w-[6.5rem] px-2 text-xs')}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-subtle">{t('plan.to')}</span>
              <input
                type="time"
                value={toTimeInput(stop.endsAtMin)}
                onChange={(event) => {
                  setTime('endsAtMin', event.target.value);
                }}
                className={fieldClass('h-9 w-[6.5rem] px-2 text-xs')}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setEditingTime(false);
              }}
              className="text-primary shrink-0 text-xs font-medium"
            >
              {t('common.done')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingTime(true);
            }}
            className={cn(
              'mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium',
              stop.startsAtMin === null ? 'text-ink-subtle' : 'text-ink',
            )}
          >
            <Clock className="size-3.5" aria-hidden />
            {stop.startsAtMin === null ? (
              t('plan.setTime')
            ) : (
              <span className="tabular-nums">
                {formatTimeOfDay(stop.startsAtMin, locale)}
                {stop.endsAtMin !== null && ` – ${formatTimeOfDay(stop.endsAtMin, locale)}`}
                {stop.crossesMidnight && ` · ${t('plan.crossesMidnight')}`}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <button
          type="button"
          disabled={isFirst}
          aria-label={t('plan.moveUp')}
          onClick={() => {
            onMove(index, -1);
          }}
          className="text-ink-subtle flex size-8 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronUp className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={isLast}
          aria-label={t('plan.moveDown')}
          onClick={() => {
            onMove(index, 1);
          }}
          className="text-ink-subtle flex size-8 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronDown className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t('plan.removeStop')}
          disabled={removeStop.isPending}
          onClick={() => {
            removeStop.mutate(stop.id);
          }}
          className="text-ink-subtle hover:text-danger flex size-8 items-center justify-center rounded-full"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
