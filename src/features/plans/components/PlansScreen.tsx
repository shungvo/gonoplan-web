'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Plus } from 'lucide-react';
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
import { usePlans, useCreatePlan } from '../hooks/usePlans';
import { PlanEditorScreen } from './PlanEditorScreen';
import type { Plan } from '../api';

/**
 * The Plan tab.
 *
 * A list of days, newest first, and one button. Everything about arranging a
 * day lives one screen in — this one only has to answer "which day?".
 */
export function PlansScreen() {
  const t = useT();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [composing, setComposing] = useState(false);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  const plans = usePlans(isAuthenticated);
  const saved = useSavedPlaces();

  return (
    <div className="px-safe">
      <header className="pt-safe-float px-5">
        <h1 className="text-ink pt-6 text-title leading-tight font-semibold tracking-tight">
          {t('plans.title')}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">{t('plans.description')}</p>
      </header>

      {/*
        The saved places, across the top.

        A plan is built out of places somebody has already decided they want to
        go to, and until now those lived two taps away under the profile while
        this screen offered a blank "add a place" search. Putting them here
        makes the shortlist the raw material it already was.
      */}
      {/*
        The saved places, as a deck.

        A rail invites scanning, and this is not a list to scan — it is the
        shortlist a day gets built from, one place at a time: "this one, or the
        next?". The same shape the home screen uses for recommendations, and
        the same component, because two decks that drift apart is two decks.
      */}
      {isAuthenticated && (saved.data?.data.length ?? 0) > 0 && (
        <section className="mt-5" aria-label={t('plan.savedRail')}>
          <h2 className="text-ink px-5 text-sm font-semibold">{t('plan.savedRail')}</h2>

          <PlaceCardStack
            className="mt-3"
            places={saved.data?.data}
            onSelect={(place) => {
              setOpenPlaceId(place.id);
            }}
          />
        </section>
      )}

      <div className="mt-5 px-5">
        {!isAuthenticated && (
          <EmptyState
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

        {isAuthenticated && (
          <>
            <Button
              fullWidth
              leadingIcon={<Plus className="size-4" aria-hidden />}
              onClick={() => {
                setComposing(true);
              }}
            >
              {t('plans.new')}
            </Button>

            {plans.isPending && (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="bg-surface h-28 animate-pulse rounded-lg shadow-md" />
                ))}
              </div>
            )}

            {plans.data?.length === 0 && (
              <EmptyState
                icon={<CalendarDays className="size-7" aria-hidden />}
                title={t('plans.emptyTitle')}
                description={t('plans.emptyBody')}
              />
            )}

            <ul className="mt-4 space-y-3">
              {plans.data?.map((plan) => (
                <li key={plan.id}>
                  <PlanCard
                    plan={plan}
                    onOpen={() => {
                      setOpenPlanId(plan.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

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
      { onSuccess: (plan) => { onCreated(plan.id); } },
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
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
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
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
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

/**
 * A day, as a card you can see.
 *
 * It was a 20px-tall row: a title, a line of grey, a chevron. Days are the
 * thing this tab is *for*, and they read as list items in a settings screen —
 * so the card is 112px, raised on `shadow-md` rather than the hairline
 * `shadow-sm` the rows carried, and it leads with a photograph.
 *
 * The photograph is the first stop's, chosen by the API. Nobody uploads a
 * picture for a plan; the plan is already made of places that have them.
 */
function PlanCard({ plan, onOpen }: { plan: Plan; onOpen: () => void }) {
  const t = useT();
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-surface flex w-full items-stretch gap-3.5 overflow-hidden rounded-lg p-3 text-left shadow-md press-surface"
    >
      <span className="bg-surface-sunken relative size-[5.5rem] shrink-0 overflow-hidden rounded-md">
        <PlaceImage
          url={plan.coverImageUrl}
          blurhash={plan.coverBlurhash}
          name={plan.title}
          categorySlug={plan.coverCategorySlug ?? 'other'}
          categoryColor={plan.coverCategoryColor ?? '#0f6ccd'}
          sizes="88px"
          fallbackSize="sm"
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-ink truncate font-semibold">{plan.title}</span>
        <span className="text-ink-subtle mt-0.5 block text-xs">
          {plan.date ? formatDate(plan.date, locale) : t('plans.noDate')} ·{' '}
          {t('plans.stopCount', { count: plan.stopCount })}
        </span>

        {/* The day's own description, when there is one. Two lines: enough to
            tell two Sundays apart, not enough to turn the list back into a
            wall of text. */}
        {plan.note && (
          <span className="text-ink-muted mt-1.5 line-clamp-2 text-xs leading-relaxed">
            {plan.note}
          </span>
        )}
      </span>
    </button>
  );
}
