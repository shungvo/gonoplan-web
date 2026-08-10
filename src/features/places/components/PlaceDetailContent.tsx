'use client';

import { useState } from 'react';
import { Globe, MapPin, Navigation, Phone, Share2 } from 'lucide-react';
import { PlaceImage } from './PlaceImage';
import { OpeningHours } from './OpeningHours';
import { ReviewSection } from '@/features/reviews/components/ReviewSection';
import { SaveButton } from '@/features/favorites/components/SaveButton';
import { AuthSheet } from '@/features/auth/components/AuthSheet';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { formatDistance } from '@/lib/geo/grid';
import { cn } from '@/lib/utils/cn';
import type { PlaceDetail } from '../api';

/**
 * Place detail body (§21), shared by the bottom sheet and the deep-link page.
 *
 * One component for both so the two can never drift — the sheet is not a
 * cut-down preview, it is the same screen presented differently.
 */
export function PlaceDetailContent({
  place,
  compact = false,
}: {
  place: PlaceDetail;
  compact?: boolean;
}) {
  const [authOpen, setAuthOpen] = useState(false);

  /**
   * Hands off to the device's map app.
   *
   * Turn-by-turn navigation is not something a PWA should reimplement badly:
   * the native app has the GPS, the voice, and the traffic. In-app route
   * preview arrives with the routing proxy in a later phase; this is the
   * action people actually want from a discovery app today.
   */
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${String(place.latitude)},${String(place.longitude)}`;

  const share = async () => {
    const url = `${window.location.origin}/place/${place.slug}`;
    if (navigator.share) {
      // Deliberately swallowed: the user cancelling the share sheet rejects
      // this promise, and that is not an error worth surfacing.
      await navigator.share({ title: place.name, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
  };

  return (
    <article>
      {/* Fixed height in the sheet rather than an aspect ratio: at a peek height
          of ~470px a 16:9 hero eats 219px and pushes the CTA out of view. The
          full-page hero can afford to be generous. */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-surface-sunken',
          compact ? 'h-40' : 'aspect-[4/3] max-h-[46dvh]',
        )}
      >
        <PlaceImage
          url={place.coverImageUrl}
          blurhash={place.coverBlurhash}
          name={place.name}
          categorySlug={place.category.slug}
          categoryColor={place.category.colorHex}
          sizes="100vw"
          priority
          fallbackSize="lg"
        />
      </div>

      <div className="px-5 pt-4">
        <span
          className="inline-block rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-white"
          style={{ backgroundColor: place.category.colorHex }}
        >
          {place.category.name}
          {place.subcategory ? ` · ${place.subcategory.name}` : ''}
        </span>

        <h1 className="mt-2.5 text-2xl leading-tight font-semibold tracking-tight text-ink">
          {place.name}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Rating value={place.averageRating} reviewCount={place.reviewCount} size="md" />
          <PriceRange value={place.priceRange} className="text-sm" />
          {place.distanceM !== null && (
            <span className="text-sm text-ink-muted">{formatDistance(place.distanceM)} away</span>
          )}
        </div>

        {/* Primary CTA (§21). Full width and first, because getting there is
            the action every other element on this screen leads to. */}
        <div className="mt-4 flex gap-2">
          <Button
            fullWidth
            size="lg"
            leadingIcon={<Navigation className="size-[1.125rem]" aria-hidden />}
            onClick={() => {
              window.open(directionsUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Get directions
          </Button>
          <SaveButton
            placeId={place.id}
            isSaved={place.isSaved}
            onRequireAuth={() => {
              setAuthOpen(true);
            }}
            className="size-14 shrink-0 rounded-lg"
          />
          <Button
            variant="secondary"
            size="lg"
            aria-label="Share this place"
            onClick={() => {
              void share();
            }}
            className="px-4"
          >
            <Share2 className="size-[1.125rem]" aria-hidden />
          </Button>
        </div>

        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span>{place.address}</span>
          </p>

          <OpeningHours
            hours={place.openingHours}
            isOpenNow={place.isOpenNow}
            timezone={place.timezone}
          />

          {(place.phone ?? place.website) && (
            <div className="flex flex-wrap gap-2">
              {place.phone && (
                <a
                  href={`tel:${place.phone}`}
                  className="inline-flex h-10 items-center gap-2 rounded-sm bg-surface-sunken px-3.5 text-sm font-medium text-ink"
                >
                  <Phone className="size-4" aria-hidden />
                  Call
                </a>
              )}
              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-sm bg-surface-sunken px-3.5 text-sm font-medium text-ink"
                >
                  <Globe className="size-4" aria-hidden />
                  Website
                </a>
              )}
            </div>
          )}
        </div>

        {place.description && (
          <section className="mt-5 border-t border-border pt-4">
            <h2 className="text-sm font-semibold text-ink">About</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-muted">
              {place.description}
            </p>
          </section>
        )}

        <ReviewSection placeId={place.id} placeName={place.name} />

        <div className="h-8" />
      </div>

      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason="Sign in to save places and come back to them later."
      />
    </article>
  );
}
