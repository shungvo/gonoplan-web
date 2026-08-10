'use client';

import { PlaceImage } from './PlaceImage';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { formatDistance } from '@/lib/geo/grid';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard as PlaceCardDto } from '../api';

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
  return (
    <button
      type="button"
      onClick={() => onSelect?.(place)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg bg-surface p-2.5 text-left shadow-sm',
        'transition-transform duration-150 active:scale-[0.99]',
        className,
      )}
    >
      <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-sm bg-surface-sunken">
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
        <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold text-primary">
          {place.name}
        </h3>

        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
          <span
            className="inline-block size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: place.category.colorHex }}
            aria-hidden
          />
          <span className="truncate">{place.category.name}</span>
          {place.isOpenNow && (
            <span className="shrink-0 font-semibold text-success">· Open</span>
          )}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <Rating value={place.averageRating} reviewCount={place.reviewCount} />
          <PriceRange value={place.priceRange} />
          {place.distanceM !== null && (
            <span className="text-xs text-ink-subtle">{formatDistance(place.distanceM)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function PlaceListItemSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-lg bg-surface p-2.5 shadow-sm">
      <div className="size-[4.5rem] shrink-0 animate-pulse rounded-sm bg-surface-sunken" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
      </div>
    </div>
  );
}
