'use client';

import { BadgeCheck } from 'lucide-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate, formatNumber } from '@/i18n/format';
import { ContributedPlaces, ReviewList } from './ProfileLists';
import type { PublicUser } from '../api';
import { Avatar } from '@/components/ui/Avatar';

/**
 * What a profile shows, whether it is yours or somebody else's.
 *
 * One component for both so the two can never drift — and so the answer to
 * "what do other people see of me?" is literally the screen you are looking
 * at. The owner's version adds links around this; it does not add facts.
 */
export function ProfileBody({ user }: { user: PublicUser }) {
  const t = useT();
  const locale = useLocale();

  return (
    <>
      <section className="bg-surface flex items-center gap-3 rounded-lg p-4 shadow-sm">
        <Avatar name={user.name} url={user.avatarUrl} size="xl" />
        <div className="min-w-0">
          <p className="text-ink flex items-center gap-1.5 truncate text-lg font-semibold">
            <span className="truncate">{user.name}</span>
            {/* The badge exists to be seen — it was introduced as a public mark
                of trust, so a profile is exactly where it belongs. */}
            {user.isReviewer && (
              <BadgeCheck
                className="text-primary size-4 shrink-0"
                aria-label={t('profile.reviewerBadge')}
              />
            )}
          </p>
          <p className="text-ink-subtle mt-0.5 text-xs">
            {t('profile.joined', { date: formatDate(user.joinedAt, locale) })}
          </p>
          {user.bio && <p className="text-ink-muted mt-1.5 text-sm">{user.bio}</p>}
        </div>
      </section>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        {[
          {
            label: t('profile.reviewCount', { count: user.counts.reviews }),
            value: user.counts.reviews,
          },
          {
            label: t('profile.placeCount', { count: user.counts.places }),
            value: user.counts.places,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface rounded-lg p-3.5 text-center shadow-sm">
            <dd className="text-ink text-xl leading-none font-semibold tabular-nums">
              {formatNumber(stat.value, locale)}
            </dd>
            <dt className="text-ink-subtle mt-1 text-xs">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <section className="mt-6">
        <h2 className="text-ink mb-2.5 text-sm font-semibold">{t('profile.recentReviews')}</h2>
        <ReviewList reviews={user.recentReviews} />
      </section>

      <section className="mt-6">
        <h2 className="text-ink mb-2.5 text-sm font-semibold">{t('profile.contributed')}</h2>
        <ContributedPlaces places={user.places} />
      </section>
    </>
  );
}
