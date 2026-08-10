'use client';

import { useCallback, useState } from 'react';
import { Flag, Globe, MapPin, Navigation, Phone, Share2 } from 'lucide-react';
import { PlaceImage } from './PlaceImage';
import { OpeningHours } from './OpeningHours';
import { ReviewSection } from '@/features/reviews/components/ReviewSection';
import { SaveButton } from '@/features/favorites/components/SaveButton';
import { AuthSheet } from '@/features/auth/components/AuthSheet';
import { ReportSheet } from '@/features/reports/ReportSheet';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { formatDistance } from '@/lib/geo/grid';
import { cn } from '@/lib/utils/cn';
import { useSessionStore } from '@/features/auth/store';
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
  const [reportOpen, setReportOpen] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [aboutClamped, setAboutClamped] = useState(false);

  /**
   * Whether the description is longer than its three-line clamp.
   *
   * A callback ref, not an effect: it needs the laid-out node, and this runs
   * the moment React attaches it. Guarded so it only reports while collapsed —
   * once expanded the element no longer overflows, and re-measuring would hide
   * the control that gets you back.
   */
  const measureAbout = useCallback((node: HTMLParagraphElement | null) => {
    if (node && !node.classList.contains('line-clamp-3')) return;
    if (node) setAboutClamped(node.scrollHeight > node.clientHeight + 1);
  }, []);
  const { user } = useSessionStore();

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
      {/*
        Two shapes for one component.

        In the sheet the photo is edge-to-edge and runs into the sheet's own
        rounded top. On the page it is inset with its own corners and an info
        card overlapping its lower edge — which needs room to hang into, and
        would eat the sheet's peek height if it were shared.

        Only the chrome differs. Every fact below this point is rendered from
        the same markup for both, which is the part that would actually drift.
      */}
      <div className={cn('relative', compact ? '' : 'px-4 pt-2')}>
        <div
          className={cn(
            'relative w-full overflow-hidden bg-surface-sunken',
            compact ? 'h-48' : 'aspect-[4/3] max-h-[38dvh] rounded-lg shadow-md',
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

          <span
            className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-white"
            style={{ backgroundColor: `${place.category.colorHex}e6` }}
          >
            {place.category.name}
            {place.subcategory ? ` · ${place.subcategory.name}` : ''}
          </span>
        </div>

        {/* Hangs off the photo on the page; inline in the sheet, where there is
            nothing above it to overlap. */}
        <div
          className={cn(
            'bg-surface',
            compact
              ? 'px-5 pt-4'
              : 'relative -mt-10 mx-2 rounded-lg p-4 shadow-lg',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className={cn(
                  'leading-tight font-semibold tracking-tight text-primary',
                  compact ? 'text-2xl' : 'text-xl',
                )}
              >
                {place.name}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Rating value={place.averageRating} reviewCount={place.reviewCount} size="md" />
                {place.distanceM !== null && (
                  <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                    <Navigation className="size-3.5" aria-hidden />
                    {formatDistance(place.distanceM)}
                  </span>
                )}
              </div>
            </div>

            {/* The reference puts a nightly rate here. Gonoplan has no such
                number — a cafe is not booked by the night — so the slot holds
                the price band we do know, and stays empty when we do not. */}
            {place.priceRange && (
              <div className="shrink-0 text-right">
                <PriceRange value={place.priceRange} className="text-lg" />
                <p className="text-[0.6875rem] text-ink-subtle">typical</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* In the sheet the action row is inline, because a sheet that pins a
            bar to the bottom of the screen is pinning it outside itself. On
            the page it lives in the fixed bar at the end of this file, so it
            stays reachable however far the reader has scrolled. */}
        {compact && (
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
        )}

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
            {/* Clamped by lines, and the toggle appears only when the text is
                actually clamped — measured, not guessed. A character-count
                threshold got this wrong immediately: a 145-character
                description wrapped to four lines, so it was cut with no way to
                expand it, which is the one outcome worse than showing it all.
                The measurement runs in a callback ref rather than an effect,
                so it happens when the node attaches instead of after a paint. */}
            <p
              ref={measureAbout}
              className={cn(
                'mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-muted',
                !aboutExpanded && 'line-clamp-3',
              )}
            >
              {place.description}
            </p>
            {(aboutClamped || aboutExpanded) && (
              <button
                type="button"
                onClick={() => {
                  setAboutExpanded((open) => !open);
                }}
                className="mt-1 text-sm font-medium text-primary"
              >
                {aboutExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </section>
        )}

        <ReviewSection placeId={place.id} placeName={place.name} />

        {/* Low-key on purpose. Reporting has to be findable without being a
            peer of "Get directions" — the overwhelming majority of visits are
            not complaints. */}
        <button
          type="button"
          onClick={() => {
            if (user) setReportOpen(true);
            else setAuthOpen(true);
          }}
          className="text-ink-subtle hover:text-ink-muted mt-6 inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <Flag className="size-3.5" aria-hidden />
          Report a problem with this listing
        </button>

        {/* Clearance for the fixed bar, which would otherwise cover the last
            few lines of whatever is at the end of the page. */}
        <div className={compact ? 'h-8' : 'h-28'} />
      </div>

      {/*
        The page's action bar.

        Fixed rather than inline because "how do I get there" is the question
        this screen exists to answer, and by the time someone has read the
        reviews the inline button is a long way back up.

        Directions is the primary and Call is the secondary — the reference has
        "Reserve" in that slot, but Gonoplan books nothing, and a button that
        implies a reservation it cannot make is worse than one fewer button.
        With no phone number, directions simply takes the full width.
      */}
      {!compact && (
        <div className="pb-safe-float px-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg gap-2">
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-[0.9375rem] font-medium text-ink active:scale-[0.98]"
              >
                <Phone className="size-[1.125rem]" aria-hidden />
                Call
              </a>
            )}
            <Button
              size="lg"
              className={place.phone ? 'flex-1' : 'w-full'}
              leadingIcon={<Navigation className="size-[1.125rem]" aria-hidden />}
              onClick={() => {
                window.open(directionsUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              Directions
            </Button>
          </div>
        </div>
      )}

      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason="Sign in to save places and come back to them later."
      />
      <ReportSheet
        placeId={place.id}
        placeName={place.name}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </article>
  );
}
