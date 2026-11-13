'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, Eye, Link2Off, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fullAddress } from '@/features/places/address';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/i18n/format';
import { useSharedPlan } from '../hooks/usePlans';
import { formatTimeOfDay } from '../time';
import type { PlanStop } from '../api';
import { PlanCover, coverChipClass } from './PlanCover';
import { DayStats } from './DayStats';
import { DayTimeline } from './DayTimeline';
import { StopSummary } from './StopSummary';

/** The markers on the rail cut their ring out of the page behind them. */
const GROUND = { '--rail-ground': 'var(--color-background)' } as CSSProperties;

/**
 * Somebody else's day, opened from a link.
 *
 * The reader is usually not a user — they were sent this in a chat and may
 * never have heard of the app. So the page asks for nothing: no account, no
 * onboarding, no location. It is the day, in order, with the addresses
 * written out, because the person reading it is the one who has to get there.
 *
 * The same cover, figures and rail as the owner's editor, with every control
 * taken out. What is left is exactly what the owner arranged.
 */
export function SharedPlanScreen({ token }: { token: string | null }) {
  const t = useT();
  const locale = useLocale();
  const plan = useSharedPlan(token);

  if (token !== null && plan.isPending) {
    return (
      <div>
        <div className="bg-surface-sunken h-64 animate-pulse" />
        <div className="space-y-3 px-5 pt-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="bg-surface-sunken h-24 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  /*
   * No token, a dead link, or no connection — one screen for all three.
   *
   * The reader cannot do anything different about any of them: the link they
   * were given does not open. Saying *which* reason would also mean telling a
   * stranger whether a token they guessed had once been real.
   */
  if (!plan.data) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <EmptyState
          icon={<Link2Off className="size-7" aria-hidden />}
          title={t('shared.deadTitle')}
          description={t('shared.deadBody')}
          action={
            <Link href="/">
              <Button variant="secondary">{t('shared.openApp')}</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const day = plan.data;

  return (
    <main className="px-safe pb-10" style={GROUND}>
      <PlanCover
        plan={day}
        top={
          <span className={`${coverChipClass} mt-[env(safe-area-inset-top)] ml-auto`}>
            <Eye className="size-3.5" aria-hidden />
            {t('shared.readOnly')}
          </span>
        }
      >
        <h1 className="text-2xl leading-tight font-bold tracking-tight">{day.title}</h1>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pb-6 text-sm text-white/85">
          {day.date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              {formatDate(day.date, locale)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {t('plans.stopCount', { count: day.stopCount })}
          </span>
        </p>
      </PlanCover>

      <div className="px-5">
        <DayStats
          className="relative z-10 -mt-7"
          stopCount={day.stopCount}
          startsAtMin={day.startsAtMin}
          endsAtMin={day.endsAtMin}
        />

        {/* Whose day this is. A name and a picture, which is what a public
            profile already shows — the page should not read as anonymous. */}
        <p className="text-ink-muted mt-4 flex items-center gap-2.5 text-sm">
          <Avatar name={day.owner.name} url={day.owner.avatarUrl} size="sm" />
          {t('shared.by', { name: day.owner.name })}
        </p>

        {day.note && (
          <p className="border-border text-ink-muted mt-4 border-l-2 py-0.5 pl-3 text-sm leading-relaxed whitespace-pre-line">
            {day.note}
          </p>
        )}

        <div className="mt-5">
          {day.stops.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<MapPin className="size-7" aria-hidden />}
              title={t('plan.emptyTitle')}
            />
          ) : (
            <DayTimeline stops={day.stops} renderStop={(stop) => <SharedStop stop={stop} />} />
          )}
        </div>

        {/*
          The way in, after the day rather than over it.

          Somebody who was sent a link came for the link. An install banner
          across the top of a friend's plan is the app talking over them; an
          invitation under the last stop is for the reader who got to the end
          and liked what they saw.
        */}
        <section className="bg-surface mt-8 rounded-xl p-5 text-center shadow-md">
          <h2 className="text-ink text-base font-semibold">{t('shared.cta')}</h2>
          <p className="text-ink-muted mx-auto mt-1 max-w-[18rem] text-sm leading-relaxed">
            {t('shared.ctaBody')}
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button>{t('shared.openApp')}</Button>
          </Link>
        </section>
      </div>
    </main>
  );
}

function SharedStop({ stop }: { stop: PlanStop }) {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="bg-surface border-border my-1 rounded-lg border p-3 shadow-sm">
      {/* The street address, not just the district: the reader is not holding
          the app, and "Quận 1" is not something you can give a driver. */}
      <StopSummary stop={stop} detail={fullAddress(stop.place)} />

      {stop.startsAtMin !== null && (
        <p className="bg-primary-tint text-ink mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tabular-nums">
          <Clock className="size-3.5" aria-hidden />
          {formatTimeOfDay(stop.startsAtMin, locale)}
          {stop.endsAtMin !== null && ` – ${formatTimeOfDay(stop.endsAtMin, locale)}`}
          {stop.crossesMidnight && ` · ${t('plan.crossesMidnight')}`}
        </p>
      )}

      {stop.note && (
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed whitespace-pre-line">
          {stop.note}
        </p>
      )}
    </div>
  );
}
