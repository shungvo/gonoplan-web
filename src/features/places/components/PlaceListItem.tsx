'use client';

import { Clock, MapPin, Star } from 'lucide-react';
import { PlaceImage } from './PlaceImage';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { PriceRange } from '@/components/ui/Rating';
import { formatRating } from '@/i18n/format';
import { formatDistance } from '@/lib/geo/grid';
import { categoryName } from '@/features/categories/name';
import { categorySolid } from '@/features/categories/color';
import { fullAddress } from '../address';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard as PlaceCardDto } from '../api';

export interface PlaceListItemProps {
  place: PlaceCardDto;
  onSelect?: (place: PlaceCardDto) => void;
  className?: string;
}

/**
 * The Explore result — a photograph with its facts underneath.
 *
 * This was a 72px thumbnail beside three lines of text, on the reasoning that
 * a shorter row fits more results per screen. That trade was worth making when
 * the seed had no photographs and every thumbnail was a category glyph: forty
 * identical coloured squares, so the name really was all there was to go on.
 *
 * With real photographs it is the wrong way round. Choosing where to go is a
 * decision made on what the place looks like, and a 72px square cannot answer
 * that — it is an icon, not a picture. The photo is now the card, and the row
 * that used to hold four competing facts is three lines that each say one
 * thing: whether you can go now, what it is called and where, and how far.
 */
export function PlaceListItem({ place, onSelect, className }: PlaceListItemProps) {
  const t = useT();
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={() => onSelect?.(place)}
      className={cn('block w-full text-left', 'press-surface', className)}
    >
      <div className="bg-surface-sunken relative aspect-[16/10] w-full overflow-hidden rounded-lg shadow-md">
        <PlaceImage
          url={place.coverImageUrl}
          blurhash={place.coverBlurhash}
          name={place.name}
          categorySlug={place.category.slug}
          categoryColor={place.category.colorHex}
          sizes="(max-width: 640px) 100vw, 480px"
          fallbackSize="lg"
        />

        {/*
          On the photograph, not under it. The rating is the one fact people
          use to skip a card without reading it, and a white pill on the image
          is legible over anything — which the photo underneath is not
          required to be.
        */}
        <span className="bg-surface text-ink absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md">
          <Star className="size-3.5 fill-warning text-warning" aria-hidden />
          {formatRating(place.averageRating, locale)}
          <span className="text-ink-subtle font-normal">
            ({place.reviewCount})
          </span>
        </span>

        <span
          className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-2xs font-semibold text-white"
          style={{ backgroundColor: categorySolid(place.category.colorHex) }}
        >
          {categoryName(place.category, locale)}
        </span>
      </div>

      {/*
        Open first, because it is the only line that can rule the place out —
        the rest is worth reading only if you can actually go.
      */}
      <p
        className={cn(
          'mt-2.5 flex items-center gap-1.5 text-2xs font-bold tracking-wide uppercase',
          place.isOpenNow ? 'text-primary' : 'text-ink-subtle',
        )}
      >
        <Clock className="size-3.5 shrink-0" aria-hidden />
        {place.isOpenNow && place.closesAt
          ? t('place.openUntil', { time: place.closesAt })
          : place.isOpenNow
            ? t('place.openNow')
            : t('place.closedNow')}
      </p>

      <h3 className="text-ink mt-1 line-clamp-1 text-base leading-snug font-bold">{place.name}</h3>

      {/* `fullAddress`, not `address + district`. Most contributors already
          type the district into the free-text line, so appending the column
          gave "…, Quận 1, Quận 1" — the same bug the share image had. */}
      <p className="text-ink-muted mt-0.5 line-clamp-1 text-sm">{fullAddress(place)}</p>

      <div className="mt-1.5 flex items-center gap-3">
        {place.distanceM !== null && (
          <span className="text-primary flex items-center gap-1 text-sm font-medium">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {formatDistance(place.distanceM, locale)}
          </span>
        )}
        <PriceRange value={place.priceRange} />
      </div>
    </button>
  );
}

/** Mirrors the card's shape so nothing shifts when the photograph arrives. */
export function PlaceListItemSkeleton() {
  return (
    <div>
      <div className="bg-surface-sunken aspect-[16/10] w-full animate-pulse rounded-lg shadow-md" />
      <div className="mt-2.5 space-y-2">
        <div className="bg-surface-sunken h-3 w-28 animate-pulse rounded-full" />
        <div className="bg-surface-sunken h-4 w-2/3 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-1/2 animate-pulse rounded" />
      </div>
    </div>
  );
}
