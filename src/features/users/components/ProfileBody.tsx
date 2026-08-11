'use client';

import Link from 'next/link';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { categoryName } from '@/features/categories/name';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate, formatNumber, formatRating } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import type { PublicUser } from '../api';

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
        <span className="bg-primary-tint text-primary flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
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
          { label: t('profile.reviewCount', { count: user.counts.reviews }), value: user.counts.reviews },
          { label: t('profile.placeCount', { count: user.counts.places }), value: user.counts.places },
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
        <h2 className="text-ink text-sm font-semibold">{t('profile.recentReviews')}</h2>

        {user.recentReviews.length === 0 ? (
          <p className="text-ink-subtle mt-2 text-sm">{t('profile.noReviews')}</p>
        ) : (
          <ul className="mt-2.5 space-y-2.5">
            {user.recentReviews.map((review) => (
              <li key={review.id}>
                <Link
                  href={`/place/${review.place.slug}`}
                  className="bg-surface block rounded-lg p-3.5 shadow-sm active:scale-[0.99]"
                >
                  <p className="text-ink flex items-center gap-1.5 text-sm font-semibold">
                    <Star className="fill-warning text-warning size-3.5 shrink-0" aria-hidden />
                    <span className="tabular-nums">{formatRating(review.rating, locale)}</span>
                    <span className="text-ink-muted min-w-0 truncate font-normal">
                      {review.place.name}
                    </span>
                  </p>
                  {review.content && (
                    <p className="text-ink-muted mt-1 line-clamp-2 text-sm leading-relaxed">
                      {review.content}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-ink text-sm font-semibold">{t('profile.contributed')}</h2>

        {user.places.length === 0 ? (
          <p className="text-ink-subtle mt-2 text-sm">{t('profile.noPlaces')}</p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {user.places.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/place/${place.slug}`}
                  className={cn(
                    'bg-surface flex items-center gap-3 rounded-lg p-2.5 shadow-sm',
                    'active:scale-[0.99]',
                  )}
                >
                  <div className="bg-surface-sunken relative size-12 shrink-0 overflow-hidden rounded-sm">
                    <PlaceImage
                      url={place.coverImageUrl}
                      blurhash={place.coverBlurhash}
                      name={place.name}
                      categorySlug={place.category.slug}
                      categoryColor={place.category.colorHex}
                      sizes="48px"
                      fallbackSize="sm"
                    />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-sm font-medium">
                      {place.name}
                    </span>
                    <span className="text-ink-subtle flex items-center gap-1 truncate text-xs">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      {categoryName(place.category, locale)} ·{' '}
                      {place.district ?? place.province}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
