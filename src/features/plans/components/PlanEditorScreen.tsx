'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Link2,
  MapPin,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fieldClass } from '@/components/ui/field';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import {
  useDeletePlan,
  usePlan,
  useRemoveStop,
  useReorderStops,
  useUpdatePlan,
  useUpdateStop,
} from '../hooks/usePlans';
import { formatTimeOfDay, parseTimeInput, toTimeInput } from '../time';
import type { PlanDetail, PlanStop } from '../api';
import { PlanNote } from './PlanNote';
import { AddStopSheet } from './AddStopSheet';
import { SharePlanSheet } from './SharePlanSheet';
import { PlanCover, coverButtonClass, coverChipClass } from './PlanCover';
import { DayStats } from './DayStats';
import { DayTimeline, Rail } from './DayTimeline';
import { StopSummary } from './StopSummary';

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
  const router = useRouter();
  const describeError = useErrorMessage();

  const plan = usePlan(planId);
  const reorder = useReorderStops(planId);

  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);

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
      <div className={compact ? 'px-3 pt-1' : 'px-safe'}>
        <div className={cn('bg-surface-sunken h-56 animate-pulse', compact && 'rounded-xl')} />
        <div className="space-y-3 px-2 pt-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="bg-surface-sunken h-24 animate-pulse rounded-lg" />
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

  /*
   * What the rail's markers cut their ring out of.
   *
   * Each marker has a ring in the colour of whatever is behind it, so the line
   * appears to stop short of the marker instead of running under it. Behind it
   * is the sheet's white in one place and the page's grey in the other.
   */
  const ground = {
    '--rail-ground': compact ? 'var(--color-surface)' : 'var(--color-background)',
  } as CSSProperties;

  return (
    <div className={compact ? '' : 'px-safe'} style={ground}>
      <EditorCover
        plan={plan.data}
        planId={planId}
        compact={compact}
        onBack={leave}
        onShare={() => {
          setSharing(true);
        }}
      />

      <div className="px-5">
        {/* Pulled up over the cover's bottom edge, so picture and figures read
            as one object rather than a header followed by a table. */}
        <DayStats
          className="relative z-10 -mt-7"
          stopCount={stops.length}
          startsAtMin={plan.data.startsAtMin}
          endsAtMin={plan.data.endsAtMin}
        />

        <EditorNote planId={planId} note={plan.data.note} />

        <div className="mt-5">
          {stops.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<MapPin className="size-7" aria-hidden />}
              title={t('plan.emptyTitle')}
              description={t('plan.emptyBody')}
            />
          ) : (
            <DayTimeline
              stops={stops}
              renderStop={(stop, index) => (
                <StopCard
                  planId={planId}
                  stop={stop}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === stops.length - 1}
                  onMove={move}
                />
              )}
              after={
                /*
                 * The next stop, not yet chosen.
                 *
                 * A dashed marker on the same rail: adding a place is
                 * extending the route, and it should look like the route's
                 * next node rather than a button that happens to be below it.
                 */
                <>
                  <Rail end="marker">
                    <span
                      className="border-border text-ink-subtle relative mt-3.5 flex size-8 items-center justify-center rounded-full border-2 border-dashed bg-[var(--rail-ground)]"
                      aria-hidden
                    >
                      <Plus className="size-4" />
                    </span>
                  </Rail>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                    }}
                    className="border-border text-ink-muted press-soft mt-2 flex h-14 w-full items-center rounded-lg border-2 border-dashed px-4 text-left text-sm font-medium"
                  >
                    {t('plan.addPlace')}
                  </button>
                </>
              }
            />
          )}

          {reorder.error != null && (
            <p role="alert" className="bg-danger/10 text-danger mt-4 rounded-md p-3 text-sm">
              {/* A 409 here means the plan moved under us — another tab, another
                  device. Reloading is the only honest fix. */}
              {t('plan.reloadNeeded')}
            </p>
          )}
        </div>

        <DeletePlan planId={planId} title={plan.data.title} onDeleted={leave} />
      </div>

      {/*
        The two things you came to do, always in reach.

        They sat under the title, which meant that on a day with six stops they
        were a screen and a half above the place you were looking at when you
        wanted them. Pinned to the bottom they are under the thumb wherever the
        scroll is, and the header is left to be about the day.

        Neither container's bottom edge is where the screen ends, so both need
        an explicit offset. On the page the floating tab bar sits over the
        scroller, and padding does not move a sticky child. In the sheet, the
        panel is 95dvh tall and rests at 0.95 of that (`SHEET_SNAP_POINTS`), so
        its last 5% — 4.75dvh — is below the bottom of the screen; `bottom-0`
        put half of this bar down there with it.
      */}
      <div
        className={cn(
          'sticky z-20 mt-6 flex gap-2 px-5 pt-4 pb-3',
          'bg-gradient-to-t via-[var(--rail-ground)] to-transparent',
          'from-[var(--rail-ground)]',
          compact ? 'bottom-[4.75dvh]' : 'bottom-[var(--nav-clearance)]',
        )}
      >
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
          disabled={stops.length === 0}
          onClick={() => {
            setSharing(true);
          }}
          leadingIcon={<Share2 className="size-[1.125rem]" aria-hidden />}
          className="shrink-0 px-4"
        >
          {t('plan.share')}
        </Button>
      </div>

      {/* The same 5% again, as real height: without it the bar's resting place
          at the end of the scroll is the off-screen strip it is avoiding. */}
      {compact && <div className="pb-safe-float h-[4.75dvh]" />}

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

function EditorCover({
  plan,
  planId,
  compact,
  onBack,
  onShare,
}: {
  plan: PlanDetail;
  planId: string;
  compact: boolean;
  onBack: () => void;
  onShare: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const updatePlan = useUpdatePlan(planId);

  /*
   * The title is typed into a draft and saved when the field is left.
   *
   * It was bound straight to the server's copy with a PATCH on every
   * keystroke: each letter waited on a round trip before it appeared, and a
   * slow connection reordered them. `null` means "not editing", so the field
   * shows whatever the server last said.
   */
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);

  const commitTitle = () => {
    if (titleDraft === null) return;

    const next = titleDraft.trim();
    setTitleDraft(null);
    // An emptied title is put back rather than saved — a day with no name is
    // a row nobody can find again, and the API refuses it anyway.
    if (next === '' || next === plan.title) return;
    updatePlan.mutate({ title: next });
  };

  return (
    <PlanCover
      plan={plan}
      className={compact ? 'mx-3 rounded-xl' : undefined}
      top={
        <>
          {/* The sheet has its own handle and closes by dragging; a second way
              back on top of it would be a button that does what the gesture
              under your thumb already does. */}
          {compact ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('plan.back')}
              className={cn(coverButtonClass, 'mt-[env(safe-area-inset-top)]')}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          )}

          <button
            type="button"
            onClick={onShare}
            disabled={plan.stops.length === 0}
            aria-label={t('plan.share')}
            className={cn(coverButtonClass, !compact && 'mt-[env(safe-area-inset-top)]')}
          >
            <Share2 className="size-[1.125rem]" aria-hidden />
          </button>
        </>
      }
    >
      {/* The title edits in place. A day gets renamed as it takes shape —
          "Sunday" becomes "Sunday, District 1 coffee" — and sending someone
          to a settings screen for that loses the thought. */}
      <input
        value={titleDraft ?? plan.title}
        onFocus={() => {
          setTitleDraft(plan.title);
        }}
        onChange={(event) => {
          setTitleDraft(event.target.value.slice(0, 120));
        }}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        enterKeyHint="done"
        aria-label={t('plans.titleLabel')}
        className="w-full bg-transparent text-2xl leading-tight font-bold tracking-tight text-white outline-none placeholder:text-white/60"
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-2 pb-6">
        {editingDate ? (
          <input
            type="date"
            autoFocus
            value={plan.date ?? ''}
            onChange={(event) => {
              updatePlan.mutate({ date: event.target.value || null });
            }}
            onBlur={() => {
              setEditingDate(false);
            }}
            aria-label={t('plans.dateLabel')}
            className={fieldClass('h-9 w-auto px-3 text-sm')}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingDate(true);
            }}
            className={cn(coverChipClass, 'tap-44')}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {plan.date ? formatDate(plan.date, locale) : t('plans.noDate')}
          </button>
        )}

        {/* Says so on the day itself. A link somebody made last week is easy
            to forget, and "who can see this?" should not need the share sheet
            opened to answer. */}
        {plan.shareToken !== null && (
          <button type="button" onClick={onShare} className={cn(coverChipClass, 'tap-44')}>
            <Link2 className="size-3.5" aria-hidden />
            {t('plans.shared')}
          </button>
        )}
      </div>
    </PlanCover>
  );
}

function EditorNote({ planId, note }: { planId: string; note: string | null }) {
  const t = useT();
  const updatePlan = useUpdatePlan(planId);

  /*
   * What the day is for, in the owner's words.
   *
   * It describes the whole plan rather than any one stop — "brunch then the
   * museum, back before the rain". Saved on blur rather than per keystroke:
   * this is prose, and a request per character is a request per character.
   */
  return (
    <PlanNote
      value={note}
      placeholder={t('plan.notePlaceholder')}
      label={t('plan.noteLabel')}
      maxLength={2000}
      onSave={(next) => {
        updatePlan.mutate({ note: next });
      }}
      className="border-border mt-4 border-l-2 py-0.5 pl-3"
    />
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

  const hasTime = stop.startsAtMin !== null;

  return (
    <div className="bg-surface border-border my-1 rounded-lg border p-3 shadow-sm">
      <StopSummary stop={stop} />

      {/*
        The time, as the row's own control.

        Filled once there is a time, dashed while there is not — an unset time
        is an invitation, and a grey line of text reading "Set a time" was
        easy to take for a caption.
      */}
      <button
        type="button"
        onClick={() => {
          setEditingTime((open) => !open);
        }}
        aria-expanded={editingTime}
        className={cn(
          'tap-44 mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
          hasTime
            ? 'bg-primary-tint text-ink'
            : 'border-border text-ink-subtle border border-dashed',
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

      {/*
        The inputs are `flex-1 min-w-0` so they give way instead of
        overflowing: at fixed widths the second one was clipped by the card
        edge and the Done button sat off the right of the screen.
      */}
      {editingTime && (
        <div className="mt-3 flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="text-ink-subtle block text-xs">{t('plan.from')}</span>
            <input
              type="time"
              autoFocus
              value={toTimeInput(stop.startsAtMin)}
              onChange={(event) => {
                setTime('startsAtMin', event.target.value);
              }}
              className={fieldClass('mt-1 h-11 w-full min-w-0 px-2 text-sm')}
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
              className={fieldClass('mt-1 h-11 w-full min-w-0 px-2 text-sm')}
            />
          </label>
          <button
            type="button"
            aria-label={t('common.done')}
            onClick={() => {
              setEditingTime(false);
            }}
            className="bg-primary press-firm flex size-11 shrink-0 items-center justify-center rounded-md text-white"
          >
            <Check className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* What you are doing here, in the owner's words. */}
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

      {/*
        The controls, on their own row under the content — and 44px each.
        They were 32px, in a row, a thumb's width apart: the one place in the
        app where missing a target reorders or deletes something.
      */}
      <div className="border-border -mx-1 mt-2 flex items-center border-t pt-1">
        <button
          type="button"
          disabled={isFirst}
          aria-label={t('plan.moveUp')}
          onClick={() => {
            onMove(index, -1);
          }}
          className="text-ink-muted press-firm flex size-11 items-center justify-center rounded-full disabled:opacity-25"
        >
          <ChevronUp className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          disabled={isLast}
          aria-label={t('plan.moveDown')}
          onClick={() => {
            onMove(index, 1);
          }}
          className="text-ink-muted press-firm flex size-11 items-center justify-center rounded-full disabled:opacity-25"
        >
          <ChevronDown className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t('plan.removeStop')}
          disabled={removeStop.isPending}
          onClick={() => {
            removeStop.mutate(stop.id);
          }}
          className="text-ink-subtle press-firm ml-auto flex size-11 items-center justify-center rounded-full"
        >
          <Trash2 className="size-[1.125rem]" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Deleting the whole day.
 *
 * There was no way to do this at all — the strings for a confirmation had been
 * written and nothing ever showed them, so a plan made by mistake stayed in the
 * list for good.
 *
 * Asked for twice, in place: the button becomes the question. A dialog would be
 * a third layer over a sheet that is already over a page.
 */
function DeletePlan({
  planId,
  title,
  onDeleted,
}: {
  planId: string;
  title: string;
  onDeleted: () => void;
}) {
  const t = useT();
  const remove = useDeletePlan();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
        }}
        className="text-ink-subtle mx-auto mt-8 flex h-11 items-center gap-1.5 px-3 text-sm"
      >
        <Trash2 className="size-4" aria-hidden />
        {t('plan.delete')}
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={t('plan.delete')} className="bg-danger/8 mt-8 rounded-lg p-4">
      <p className="text-ink text-sm font-semibold">{t('plans.deleteTitle', { title })}</p>
      <p className="text-ink-muted mt-1 text-sm">{t('plans.deleteBody')}</p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => {
            setConfirming(false);
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          fullWidth
          isLoading={remove.isPending}
          onClick={() => {
            remove.mutate(planId, { onSuccess: onDeleted });
          }}
        >
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
