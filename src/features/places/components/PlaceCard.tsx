'use client';

import { Clock } from 'lucide-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { PlaceImage } from './PlaceImage';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { formatDistance } from '@/lib/geo/grid';
import { categoryName } from '@/features/categories/name';
import { categorySolid } from '@/features/categories/color';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard as PlaceCardDto } from '../api';

export interface PlaceCardProps {
  place: PlaceCardDto;
  onSelect?: (place: PlaceCardDto) => void;
  priority?: boolean;
  className?: string;
}

/**
 * The horizontal rail card (§14).
 *
 * Shows exactly the five things §19 says a result must carry — image, name,
 * category, rating, distance, price — and nothing more. A card that tries to
 * show everything is a card nobody can scan while walking.
 */
export function PlaceCard({ place, onSelect, priority = false, className }: PlaceCardProps) {
  const t = useT();
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={() => onSelect?.(place)}
      className={cn(
        'bg-surface w-[16.5rem] shrink-0 overflow-hidden rounded-lg text-left shadow-md',
        'transition-transform duration-150 ease-[var(--ease-out-soft)] active:scale-[0.98]',
        className,
      )}
    >
      <div className="bg-surface-sunken relative aspect-[4/3] w-full overflow-hidden">
        <PlaceImage
          url={place.coverImageUrl}
          blurhash={place.coverBlurhash}
          name={place.name}
          categorySlug={place.category.slug}
          categoryColor={place.category.colorHex}
          sizes="264px"
          priority={priority}
          fallbackSize="md"
        />

        <span
          className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-2xs font-semibold text-white backdrop-blur-sm"
          style={{ backgroundColor: categorySolid(place.category.colorHex) }}
        >
          {categoryName(place.category, locale)}
        </span>

        {/* Only shown when open. A "Closed" badge on every card at 2am makes the
            whole screen look shut; absence reads as neutral. */}
        {place.isOpenNow && (
          <span className="bg-surface/90 text-success absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-semibold backdrop-blur-sm">
            <Clock className="size-3" aria-hidden />
            {t('place.openNow')}
          </span>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="text-primary truncate text-md leading-snug font-semibold">
          {place.name}
        </h3>

        <div className="mt-1.5 flex items-center gap-2">
          <Rating value={place.averageRating} reviewCount={place.reviewCount} />
          <PriceRange value={place.priceRange} />
        </div>

        <p className="text-ink-subtle mt-1.5 truncate text-xs">
          {place.distanceM !== null && <span>{formatDistance(place.distanceM, locale)} · </span>}
          {place.district ?? place.province}
        </p>
      </div>
    </button>
  );
}

/** Matches PlaceCard's exact dimensions so nothing shifts when data lands. */
export function PlaceCardSkeleton() {
  return (
    <div className="bg-surface w-[16.5rem] shrink-0 overflow-hidden rounded-lg shadow-md">
      <div className="bg-surface-sunken aspect-[4/3] w-full animate-pulse" />
      <div className="space-y-2 p-3.5">
        <div className="bg-surface-sunken h-4 w-3/4 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-1/2 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-2/5 animate-pulse rounded" />
      </div>
    </div>
  );
}
