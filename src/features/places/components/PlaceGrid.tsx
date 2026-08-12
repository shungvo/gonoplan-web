'use client';

import { Clock } from 'lucide-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { PlaceImage } from './PlaceImage';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { SaveButton } from '@/features/favorites/components/SaveButton';
import { formatDistance } from '@/lib/geo/grid';
import { categoryName } from '@/features/categories/name';
import { categorySolid } from '@/features/categories/color';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard as PlaceCardDto } from '../api';

export interface PlaceGridProps {
  places: PlaceCardDto[] | undefined;
  isPending?: boolean;
  onSelect?: (place: PlaceCardDto) => void;
  onRequireAuth?: () => void;
  className?: string;
}

/**
 * Two-column grid of places.
 *
 * The rails are for browsing sideways through a themed set; this is for
 * comparing what is actually nearby. A grid puts four places on screen at once
 * where a rail shows one and a half, and comparison is the whole job of a
 * "near you" section — you are choosing between them, not discovering a theme.
 */
export function PlaceGrid({
  places,
  isPending = false,
  onSelect,
  onRequireAuth,
  className,
}: PlaceGridProps) {
  const t = useT();
  const locale = useLocale();

  if (isPending) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 px-5', className)}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="bg-surface-sunken aspect-square w-full animate-pulse rounded-lg" />
            <div className="bg-surface-sunken h-4 w-3/4 animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-1/2 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!places || places.length === 0) return null;

  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-5 px-5', className)}>
      {places.map((place) => (
        <article key={place.id} className="min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => onSelect?.(place)}
              className="block aspect-square w-full overflow-hidden rounded-lg shadow-md press-surface"
            >
              <PlaceImage
                url={place.coverImageUrl}
                blurhash={place.coverBlurhash}
                name={place.name}
                categorySlug={place.category.slug}
                categoryColor={place.category.colorHex}
                sizes="(max-width: 640px) 45vw, 220px"
                fallbackSize="md"
                className="rounded-md"
              />

              <span
                className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-3xs font-semibold text-white"
                style={{ backgroundColor: categorySolid(place.category.colorHex) }}
              >
                {categoryName(place.category, locale)}
              </span>

              {place.isOpenNow && (
                <span className="bg-surface/90 text-ink absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-3xs font-semibold backdrop-blur-sm">
                  <Clock className="size-2.5" aria-hidden />
                  {t('place.openNow')}
                </span>
              )}
            </button>

            {/* Outside the card button — a control nested inside another
                control is a click target that cannot say which one you hit. */}
            <div className="absolute top-1.5 right-1.5">
              <SaveButton
                placeId={place.id}
                isSaved={place.isSaved}
                {...(onRequireAuth ? { onRequireAuth } : {})}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect?.(place)}
            className="mt-2 block w-full text-left"
          >
            <h3 className="text-primary line-clamp-2 text-sm leading-snug font-semibold">
              {place.name}
            </h3>

            <div className="mt-1 flex items-center gap-2">
              <Rating value={place.averageRating} reviewCount={place.reviewCount} />
              <PriceRange value={place.priceRange} />
            </div>

            {place.distanceM !== null && (
              <p className="text-ink-subtle mt-0.5 truncate text-xs">
                {formatDistance(place.distanceM, locale)} · {place.district ?? place.province}
              </p>
            )}
          </button>
        </article>
      ))}
    </div>
  );
}
