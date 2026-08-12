'use client';

import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { Rating } from '@/components/ui/Rating';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import { categoryName } from '@/features/categories/name';
import { categorySolid } from '@/features/categories/color';
import { fullAddress } from '@/features/places/address';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatRating } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import type { PublicUser } from '../api';
import { placeHref } from '@/lib/navigation/links';

/**
 * The two lists a profile carries besides its photographs.
 *
 * Lifted out of `ProfileBody` when the account tab grew tabs for them. Two
 * copies of a place card is how the review list and the contributed list end
 * up disagreeing about what a place looks like — which is the same reason the
 * sheet and the detail page share one body.
 *
 * Both are capped by the API at ten and twelve. That is a deliberate ceiling
 * on a public profile rather than a page size: a stranger's account is not
 * something to page through, and anybody who wants everything a person wrote
 * is looking for the places, not the person.
 */
export function ReviewList({ reviews }: { reviews: PublicUser['recentReviews'] }) {
  const t = useT();
  const locale = useLocale();

  if (reviews.length === 0) {
    return <p className="text-ink-subtle text-sm">{t('profile.noReviews')}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {reviews.map((review) => (
        <li key={review.id}>
          <Link
            href={placeHref(review.place.slug)}
            className="bg-surface press-surface block rounded-lg p-3.5 shadow-sm"
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
  );
}

export function ContributedPlaces({ places }: { places: PublicUser['places'] }) {
  const t = useT();
  const locale = useLocale();

  if (places.length === 0) {
    return <p className="text-ink-subtle text-sm">{t('profile.noPlaces')}</p>;
  }

  return (
    <ul className="space-y-3">
      {places.map((place) => (
        <li key={place.id}>
          {/*
            A card with the photo across the top, not a 48px thumbnail beside
            two lines of text.

            These are the places this person put on the map, and the row form
            gave them the weight of a settings entry. At this size the
            photograph is the argument for going.
          */}
          <Link
            href={placeHref(place.slug)}
            className={cn('bg-surface block overflow-hidden rounded-lg shadow-sm', 'press-surface')}
          >
            {/*
              16:9, so several still fit on a phone screen. A square at full
              width is most of a viewport per place, which turns a list of
              twelve into a scroll nobody finishes.
            */}
            <div className="bg-surface-sunken relative aspect-[16/9] w-full">
              <PlaceImage
                url={place.coverImageUrl}
                blurhash={place.coverBlurhash}
                name={place.name}
                categoryIconKey={place.category.iconKey}
                categoryColor={place.category.colorHex}
                sizes="(max-width: 30rem) 100vw, 480px"
                fallbackSize="md"
              />
              <span
                className="text-3xs absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 font-semibold text-white"
                style={{ backgroundColor: categorySolid(place.category.colorHex) }}
              >
                {categoryName(place.category, locale)}
              </span>
            </div>

            <span className="block p-3.5">
              <span className="text-ink text-md block leading-snug font-semibold">
                {place.name}
              </span>

              {/*
                Wrapped over two lines rather than truncated. Half an address
                reads as a whole one and sends people to the wrong street.
              */}
              <span className="text-ink-muted mt-1 flex gap-1.5 text-xs leading-relaxed">
                <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                <span className="line-clamp-2">{fullAddress(place)}</span>
              </span>

              {/* The shared component, so an unrated place says "New" here
                  exactly as it does on every card elsewhere — rather than
                  "0,0", which reads as bad rather than unrated. */}
              <Rating
                value={place.averageRating}
                reviewCount={place.reviewCount}
                className="mt-1.5"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
