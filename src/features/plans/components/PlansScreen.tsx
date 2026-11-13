'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Clock, Lightbulb, Link2, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fieldClass } from '@/components/ui/field';
import { BottomSheet, SHEET_SNAP_POINTS } from '@/components/ui/BottomSheet';
import { Drawer } from 'vaul';
import { useIsAuthenticated } from '@/features/auth/store';
import { useSavedPlaces } from '@/features/favorites/hooks/useFavorites';
import { PlaceCardStack } from '@/features/places/components/PlaceCardStack';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { PlaceSheet } from '@/features/places/components/PlaceSheet';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import { useNow } from '@/lib/utils/useNow';
import { usePlans, useCreatePlan } from '../hooks/usePlans';
import { formatTimeOfDay } from '../time';
import { dateTileParts, daysBetween, groupPlans, todayIn } from '../day';
import { PlanEditorScreen } from './PlanEditorScreen';
import { PlanCover, coverChipClass } from './PlanCover';
import type { Plan } from '../api';

/**
 * The Plan tab.
 *
 * It answers "which day?" — and the answer is almost always the next one. So
 * the tab leads with that day, large, and files the rest under what they are:
 * days still ahead, ideas with no date, days already gone. It used to be one
 * column sorted by date, where next Saturday, a half-formed idea and a trip
 * from last month all had the same weight.
 */
export function PlansScreen() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const now = useNow();
  const [composing, setComposing] = useState(false);
  /*
   * Seeded from `?id=`, which is how a plan is linked to.
   *
   * The path route `/plan/[id]` still exists for the web, but the app links to
   * the query form — a static export cannot emit a file per plan id. Read once
   * on mount rather than synced: after that the sheet owns the state, and
   * re-reading the URL would reopen a plan somebody has just closed.
   */
  const [openPlanId, setOpenPlanId] = useState<string | null>(() => params.get('id'));
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  const plans = usePlans(isAuthenticated);
  const saved = useSavedPlaces();

  const grouped = groupPlans(plans.data ?? [], now);
  const open = (plan: Plan) => {
    setOpenPlanId(plan.id);
  };

  return (
    <div className="px-safe">
      <header className="pt-safe-float flex items-end justify-between gap-3 px-5">
        <div className="min-w-0">
          <h1 className="text-ink text-title pt-6 leading-tight font-semibold tracking-tight">
            {t('plans.title')}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">{t('plans.description')}</p>
        </div>

        {/*
          Making a day, from the header.

          It was a full-width black bar above the list — the heaviest thing on
          the screen, and it pushed the plans you came for below it. A round
          button in the corner is where every list on a phone keeps "new", and
          it leaves the top of the screen to the next day.
        */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              setComposing(true);
            }}
            aria-label={t('plans.new')}
            className="bg-primary shadow-primary press-firm flex size-11 shrink-0 items-center justify-center rounded-full text-white"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        )}
      </header>

      {!isAuthenticated && (
        <EmptyState
          className="mt-6"
          icon={<CalendarDays className="size-7" aria-hidden />}
          title={t('plans.signedOutTitle')}
          description={t('plans.signedOutBody')}
          action={
            <Button
              onClick={() => {
                router.push('/profile');
              }}
            >
              {t('common.signIn')}
            </Button>
          }
        />
      )}

      {isAuthenticated && plans.isPending && (
        <div className="mt-5 space-y-3 px-5">
          <div className="bg-surface-sunken h-56 animate-pulse rounded-xl" />
          <div className="bg-surface-sunken h-20 animate-pulse rounded-lg" />
          <div className="bg-surface-sunken h-20 animate-pulse rounded-lg" />
        </div>
      )}

      {isAuthenticated && plans.data?.length === 0 && (
        <EmptyState
          className="mt-6"
          icon={<CalendarDays className="size-7" aria-hidden />}
          title={t('plans.emptyTitle')}
          description={t('plans.emptyBody')}
          action={
            <Button
              leadingIcon={<Plus className="size-4" aria-hidden />}
              onClick={() => {
                setComposing(true);
              }}
            >
              {t('plans.new')}
            </Button>
          }
        />
      )}

      {grouped.next && (
        <div className="mt-5 px-5">
          <NextPlanCard plan={grouped.next} now={now} onOpen={open} />
        </div>
      )}

      <PlanSection title={t('plans.section.upcoming')} plans={grouped.upcoming} onOpen={open} />
      <PlanSection title={t('plans.section.ideas')} plans={grouped.ideas} onOpen={open} />

      {/*
        The shortlist, between what is planned and what is over.

        A plan is built out of places somebody has already decided they want
        to go to. It led the screen before, above the plans themselves, which
        made the tab open on a deck of places rather than on a day. Here it is
        raw material again: under the days you are still shaping, above the
        ones you are finished with.

        A deck rather than a rail, because this is not a list to scan — it is
        "this one, or the next?", one place at a time, and the same component
        the home screen uses so the two cannot drift apart.
      */}
      {isAuthenticated && (saved.data?.data.length ?? 0) > 0 && (
        <section
          className="bg-surface mx-5 mt-7 rounded-xl p-4 shadow-md"
          aria-label={t('plan.savedRail')}
        >
          <h2 className="text-ink text-sm font-semibold">{t('plan.savedRail')}</h2>

          <PlaceCardStack
            // `px-0`: the plate already carries the inset the component adds
            // for a screen edge that is no longer there.
            className="mt-3 px-0"
            places={saved.data?.data}
            onSelect={(place) => {
              setOpenPlaceId(place.id);
            }}
          />
        </section>
      )}

      <PlanSection title={t('plans.section.past')} plans={grouped.past} onOpen={open} faded />

      <div className="h-6" />

      <BottomSheet open={composing} onOpenChange={setComposing}>
        {composing && (
          <NewPlanForm
            onCreated={(id) => {
              setComposing(false);
              // Straight into the day that was just made — the reason for
              // making it is to put something in it.
              setOpenPlanId(id);
            }}
          />
        )}
      </BottomSheet>

      {/*
        The day opens over the list rather than replacing it.

        A plan is edited in short bursts — move a stop, set a time, write a
        line — and each one used to cost a navigation out and a navigation
        back. The route still exists for links and for the back button inside
        the editor; this is the same component, in a sheet.
      */}
      <BottomSheet
        open={openPlanId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenPlanId(null);
        }}
        snapPoints={SHEET_SNAP_POINTS}
        defaultSnapIndex={2}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {openPlanId !== null && (
            <>
              <Drawer.Title className="sr-only">{t('plans.title')}</Drawer.Title>
              <PlanEditorScreen
                planId={openPlanId}
                compact
                onClose={() => {
                  setOpenPlanId(null);
                }}
              />
            </>
          )}
        </div>
      </BottomSheet>

      <PlaceSheet
        placeId={openPlaceId}
        onClose={() => {
          setOpenPlaceId(null);
        }}
      />
    </div>
  );
}

function NewPlanForm({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT();
  const describeError = useErrorMessage();
  const create = useCreatePlan();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const submit = () => {
    if (!title.trim()) return;

    create.mutate(
      { title: title.trim(), ...(date ? { date } : {}) },
      {
        onSuccess: (plan) => {
          onCreated(plan.id);
        },
      },
    );
  };

  return (
    <form
      className="pb-safe overflow-y-auto px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('plans.createTitle')}
      </Drawer.Title>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">{t('plans.titleLabel')}</span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, 120));
          }}
          placeholder={t('plans.titlePlaceholder')}
          autoFocus
          className={fieldClass('text-md mt-1.5 h-12 px-3.5')}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">
          {t('plans.dateLabel')}{' '}
          <span className="text-ink-subtle font-normal">{t('common.optional')}</span>
        </span>
        {/* A native date input: it speaks the device's locale and calendar for
            free, and a hand-rolled picker on a phone is a worse version of the
            one the OS already ships. */}
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
          }}
          className={fieldClass('text-md mt-1.5 h-12 px-3.5')}
        />
      </label>

      {create.error != null && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {describeError(create.error)}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        className="mt-5 mb-6"
        disabled={!title.trim()}
        isLoading={create.isPending}
      >
        {t('plans.create')}
      </Button>
    </form>
  );
}

/** "Today", "Tomorrow", "In 5 days" — how far off the day is, in words. */
function useCountdown(): (plan: Plan, now: number) => string | null {
  const t = useT();

  return (plan, now) => {
    if (plan.date === null) return null;

    const days = daysBetween(todayIn(plan.timezone, now), plan.date);
    if (days === 0) return t('plans.phase.today');
    if (days === 1) return t('plans.phase.tomorrow');
    return days > 1 ? t('plans.phase.inDays', { count: days }) : null;
  };
}

/** `09:00 – 18:00`, or just the start when the day has no end yet. */
function useDaySpan(): (plan: Plan) => string | null {
  const locale = useLocale();

  return (plan) => {
    if (plan.startsAtMin === null) return null;

    const start = formatTimeOfDay(plan.startsAtMin, locale);
    return plan.endsAtMin !== null && plan.endsAtMin !== plan.startsAtMin
      ? `${start} – ${formatTimeOfDay(plan.endsAtMin, locale)}`
      : start;
  };
}

/**
 * The next day, as the thing the tab opens on.
 *
 * The same cover the plan itself opens with, so tapping it is the picture
 * growing into the day rather than a list row being swapped for a screen.
 * The countdown is the one fact a list row could not carry: not "15 August"
 * but "in 3 days", which is what somebody glancing at this tab wants to know.
 */
function NextPlanCard({
  plan,
  now,
  onOpen,
}: {
  plan: Plan;
  now: number;
  onOpen: (plan: Plan) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const countdown = useCountdown()(plan, now);
  const span = useDaySpan()(plan);

  return (
    <button
      type="button"
      onClick={() => {
        onOpen(plan);
      }}
      className="press-surface block w-full overflow-hidden rounded-xl text-left shadow-lg"
    >
      <PlanCover
        plan={plan}
        top={
          <>
            {countdown && (
              <span className={cn(coverChipClass, 'bg-white text-ink backdrop-blur-none')}>
                {countdown}
              </span>
            )}
            {plan.shareToken !== null && (
              <span className={cn(coverChipClass, 'ml-auto')}>
                <Link2 className="size-3.5" aria-hidden />
                <span className="sr-only">{t('plans.shared')}</span>
              </span>
            )}
          </>
        }
      >
        <span className="block text-2xl leading-tight font-bold tracking-tight">{plan.title}</span>

        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
          {plan.date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              {formatDate(plan.date, locale)}
            </span>
          )}
          {span && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock className="size-4 shrink-0" aria-hidden />
              {span}
            </span>
          )}
        </span>

        <span className="mt-3 flex items-center justify-between gap-3">
          <StopThumbs plan={plan} ring="ring-black/40" />
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/85">
            <MapPin className="size-4" aria-hidden />
            {t('plans.stopCount', { count: plan.stopCount })}
          </span>
        </span>
      </PlanCover>
    </button>
  );
}

function PlanSection({
  title,
  plans,
  onOpen,
  faded = false,
}: {
  title: string;
  plans: Plan[];
  onOpen: (plan: Plan) => void;
  /** Days already gone: still there, no longer competing with what is ahead. */
  faded?: boolean;
}) {
  // A heading over nothing is worse than no heading. Most people have no past
  // plans the first week and no ideas ever; those sections simply are not
  // there until they have something in them.
  if (plans.length === 0) return null;

  return (
    <section className="mt-7 px-5" aria-label={title}>
      <h2 className="text-ink-muted text-xs font-semibold tracking-wide uppercase">{title}</h2>
      <ul className={cn('mt-3 space-y-2.5', faded && 'opacity-70')}>
        {plans.map((plan) => (
          <li key={plan.id}>
            <PlanRow plan={plan} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A day, as a row that leads with its date.
 *
 * The rows used to lead with a photograph, the same as a place card — but what
 * tells two plans apart is *when* they are, and that was a line of 12px grey
 * under the title. A calendar tile puts the date where the eye lands first and
 * lets the photographs do what they are good at: showing what is in the day.
 */
function PlanRow({ plan, onOpen }: { plan: Plan; onOpen: (plan: Plan) => void }) {
  const t = useT();
  const locale = useLocale();
  const span = useDaySpan()(plan);
  const tile = plan.date ? dateTileParts(plan.date, locale) : null;

  return (
    <button
      type="button"
      onClick={() => {
        onOpen(plan);
      }}
      className="bg-surface press-surface flex w-full items-center gap-3.5 rounded-lg p-3 text-left shadow-md"
    >
      {tile ? (
        <span className="bg-primary-tint flex size-14 shrink-0 flex-col items-center justify-center rounded-md">
          <span className="text-ink-muted text-2xs leading-none font-semibold uppercase">
            {tile.month}
          </span>
          <span className="text-ink mt-0.5 text-xl leading-none font-bold tabular-nums">
            {tile.day}
          </span>
          <span className="text-ink-subtle text-2xs mt-0.5 leading-none">{tile.weekday}</span>
        </span>
      ) : (
        // No date is a state, not a gap: a dashed tile with a bulb in it says
        // "an idea" where an empty calendar would say "something is missing".
        <span
          className="border-border text-ink-subtle flex size-14 shrink-0 items-center justify-center rounded-md border-2 border-dashed"
          aria-hidden
        >
          <Lightbulb className="size-5" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-ink text-md truncate font-bold">{plan.title}</span>
          {plan.shareToken !== null && (
            <>
              <Link2 className="text-ink-subtle size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t('plans.shared')}</span>
            </>
          )}
        </span>

        <span className="text-ink-subtle mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
          {span && <span className="tabular-nums">{span}</span>}
          <span>{t('plans.stopCount', { count: plan.stopCount })}</span>
        </span>

        {plan.stopPreviews.length > 0 && (
          <span className="mt-2 block">
            <StopThumbs plan={plan} ring="ring-surface" small />
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * The stops themselves, as a row of thumbnails.
 *
 * Overlapped rather than spaced: a stack reads as "these belong to one thing",
 * where a spaced row reads as four separate items and invites a tap on each.
 * The ring is what keeps two dark photographs from merging into one shape.
 */
function StopThumbs({ plan, ring, small = false }: { plan: Plan; ring: string; small?: boolean }) {
  const t = useT();
  const extra = plan.stopCount - plan.stopPreviews.length;

  if (plan.stopPreviews.length === 0) return <span />;

  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center -space-x-2">
        {plan.stopPreviews.map((stop) => (
          <span
            key={stop.id}
            className={cn(
              'bg-surface-sunken relative overflow-hidden rounded-full ring-2',
              small ? 'size-7' : 'size-9',
              ring,
            )}
          >
            <PlaceImage
              url={stop.coverImageUrl}
              blurhash={stop.coverBlurhash}
              name={stop.name}
              categoryIconKey={stop.categoryIcon}
              categoryColor={stop.categoryColor}
              sizes="36px"
              fallbackSize="sm"
            />
          </span>
        ))}
      </span>

      {extra > 0 && (
        <span className="text-xs font-medium tabular-nums opacity-80">
          {t('plans.andMore', { count: extra })}
        </span>
      )}
    </span>
  );
}
