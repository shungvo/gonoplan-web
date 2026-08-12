'use client';

import { PlaceImage } from './PlaceImage';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { formatDistance } from '@/lib/geo/grid';
import { categoryName } from '@/features/categories/name';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard as PlaceCardDto } from '../api';
import { categorySolid } from '@/features/categories/color';

export interface PlaceListItemProps {
  place: PlaceCardDto;
  onSelect?: (place: PlaceCardDto) => void;
  className?: string;
}

/**
 * The vertical list row, for Explore and search results.
 *
 * A wide thumbnail rather than the rail's 4:3 card: in a scrolling list the
 * name and rating matter more than the photo, and a shorter row means more
 * results per screen.
 */
export function PlaceListItem({ place, onSelect, className }: PlaceListItemProps) {
  const t = useT();
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={() => onSelect?.(place)}
      className={cn(
        'bg-surface flex w-full items-center gap-3 rounded-lg p-2.5 text-left shadow-md',
        'transition-transform duration-150 active:scale-[0.99]',
        className,
      )}
    >
      <div className="bg-surface-sunken relative size-[4.5rem] shrink-0 overflow-hidden rounded-sm">
        <PlaceImage
          url={place.coverImageUrl}
          blurhash={place.coverBlurhash}
          name={place.name}
          categorySlug={place.category.slug}
          categoryColor={place.category.colorHex}
          sizes="72px"
          fallbackSize="sm"
        />
      </div>

      <div className="min-w-0 flex-1">
        {/* Full width, up to two lines. Sharing this row with the "Open" badge
            left the name about 220px on a 375px screen, so it cut exactly the
            thing the row exists to show — "Ho Chi Minh City Museum of Fine
            Arts" arrived as "Ho Chi Minh City Museum of Fin…". "Open" is one
            word and reads fine next to the category instead. */}
        <h3 className="text-primary line-clamp-2 text-[0.9375rem] leading-snug font-semibold">
          {place.name}
        </h3>

        <p className="text-ink-muted mt-0.5 flex items-center gap-1.5 text-xs">
          <span
            className="inline-block size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: categorySolid(place.category.colorHex) }}
            aria-hidden
          />
          <span className="truncate">{categoryName(place.category, locale)}</span>
          {place.isOpenNow && (
            <span className="text-success shrink-0 font-semibold">· {t('place.openNow')}</span>
          )}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <Rating value={place.averageRating} reviewCount={place.reviewCount} />
          <PriceRange value={place.priceRange} />
          {place.distanceM !== null && (
            <span className="text-ink-subtle text-xs">{formatDistance(place.distanceM, locale)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function PlaceListItemSkeleton() {
  return (
    <div className="bg-surface flex w-full items-center gap-3 rounded-lg p-2.5 shadow-sm">
      <div className="bg-surface-sunken size-[4.5rem] shrink-0 animate-pulse rounded-sm" />
      <div className="flex-1 space-y-2">
        <div className="bg-surface-sunken h-4 w-2/3 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-1/3 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-1/2 animate-pulse rounded" />
      </div>
    </div>
  );
}
