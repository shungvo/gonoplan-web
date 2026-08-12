'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  Check,
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
import { PlanNote } from './PlanNote';
import { AddStopSheet } from './AddStopSheet';
import { SharePlanSheet } from './SharePlanSheet';
import { BackButton } from '@/components/ui/BackButton';

/**
 * One day, in order.
 *
 * Reordering is two buttons rather than a drag handle. A drag list inside a
 * scrolling page on a phone has to win a fight with the scroll on every touch,
 * and the arrows are reachable one-handed, work with a keyboard and a screen
 * reader, and cannot be started by accident while reading.
 */
export function PlanEditorScreen({
  planId,
  compact = false,
  onClose,
}: {
  planId: string;
  /**
   * Rendered inside the sheet on the Plan tab rather than as its own page.
   *
   * One component for both, the same bargain `PlaceDetailContent` makes: the
   * sheet is not a cut-down preview of the editor, it is the editor. Only the
   * chrome differs — the page carries a back button and the safe-area padding,
   * the sheet is already inside something that has both.
   */
  compact?: boolean;
  onClose?: (() => void) | undefined;
}) {
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

  // The way out differs by where this is rendered: a page navigates, a sheet
  // closes itself.
  const leave = () => {
    if (onClose) onClose();
    else router.push('/plan');
  };

  if (plan.isPending) {
    return (
      <div className={compact ? 'px-5 pt-2' : 'px-safe pt-safe-float px-5'}>
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
      <div className={compact ? 'px-5 pt-2' : 'px-safe pt-safe-float px-5'}>
        <EmptyState
          className="pt-20"
          title={describeError(plan.error)}
          action={
            <Button variant="secondary" onClick={leave}>
              {compact ? t('common.close') : t('plan.back')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={compact ? 'pb-6' : 'px-safe pb-10'}>
      <header className={compact ? 'px-5 pt-2' : 'pt-safe-float px-5'}>
        {!compact && (
          <BackButton
            label={t('plan.back')}
            onClick={() => {
              router.push('/plan');
            }}
          />
        )}

        {/* The title edits in place. A day gets renamed as it takes shape —
            "Sunday" becomes "Sunday, District 1 coffee" — and sending someone
            to a settings screen for that loses the thought. */}
        <input
          value={plan.data.title}
          onChange={(event) => {
            updatePlan.mutate({ title: event.target.value.slice(0, 120) });
          }}
          aria-label={t('plans.titleLabel')}
          className="text-ink mt-1 w-full bg-transparent text-title leading-tight font-semibold tracking-tight outline-none"
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

        {/*
          What the day is for, in the owner's words.

          Sits under the date because it describes the whole plan rather than
          any one stop — "brunch then the museum, back before the rain". Saved
          on blur rather than per keystroke: this is prose, and a request per
          character is a request per character.
        */}
        <PlanNote
          value={plan.data.note}
          placeholder={t('plan.notePlaceholder')}
          label={t('plan.noteLabel')}
          maxLength={2000}
          onSave={(note) => {
            updatePlan.mutate({ note });
          }}
          className="mt-3"
        />

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
    <div className="bg-surface rounded-lg p-3 shadow-sm">
      <div className="flex gap-3">
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
            className="text-primary block truncate text-md font-semibold"
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

          <button
            type="button"
            onClick={() => {
              setEditingTime((open) => !open);
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

      {/*
        The time editor spans the whole card rather than sitting in the middle
        column beside the thumbnail and the move buttons.

        It used to live there, with two fixed 6.5rem inputs and a "Done"
        button, inside a column about 220px wide on a 375px phone. Fixed-width
        flex children cannot shrink, so the second input was clipped by the
        card edge and Done sat 44px off the right of the screen — reachable by
        nothing. The inputs are `flex-1 min-w-0` now, which is what lets them
        give way instead of overflowing.
      */}
      {editingTime && (
        <div className="border-border mt-3 flex items-end gap-2 border-t pt-3">
          <label className="min-w-0 flex-1">
            <span className="text-ink-subtle block text-xs">{t('plan.from')}</span>
            <input
              type="time"
              autoFocus
              value={toTimeInput(stop.startsAtMin)}
              onChange={(event) => {
                setTime('startsAtMin', event.target.value);
              }}
              className={fieldClass('mt-1 h-10 w-full min-w-0 px-2 text-sm')}
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="text-ink-subtle block text-xs">{t('plan.to')}</span>
            <input
              type="time"
              value={toTimeInput(stop.endsAtMin)}
              onChange={(event) => {
                setTime('endsAtMin', event.target.value);
              }}
              className={fieldClass('mt-1 h-10 w-full min-w-0 px-2 text-sm')}
            />
          </label>
          <button
            type="button"
            aria-label={t('common.done')}
            onClick={() => {
              setEditingTime(false);
            }}
            className="bg-primary-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-md"
          >
            <Check className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* What you are doing here, in the owner's words. Below the row rather
          than inside the middle column: it is a sentence, and a sentence in a
          220px column beside a thumbnail and two move buttons wraps to five
          lines. */}
      <PlanNote
        value={stop.note}
        label={t('plan.stopNoteLabel')}
        placeholder={t('plan.stopNotePlaceholder')}
        maxLength={500}
        onSave={(note) => {
          updateStop.mutate({ stopId: stop.id, note });
        }}
        className="mt-2.5"
      />
    </div>
  );
}
