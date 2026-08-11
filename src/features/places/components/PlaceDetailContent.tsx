'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Flag, Globe, MapPin, Navigation, Phone, Share2 } from 'lucide-react';
import Image from 'next/image';
import { PlaceGallery } from './PlaceGallery';
import { OpeningHours } from './OpeningHours';
import { ReviewSection } from '@/features/reviews/components/ReviewSection';
import { RouteToPlace } from '@/features/geo/components/RouteToPlace';
import { RichText } from '@/components/ui/RichText';
import { SaveButton } from '@/features/favorites/components/SaveButton';
import { AuthSheet } from '@/features/auth/components/AuthSheet';
import { ReportSheet } from '@/features/reports/ReportSheet';
import { Rating, PriceRange } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { formatDistance } from '@/lib/geo/grid';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber } from '@/i18n/format';
import { categoryName } from '@/features/categories/name';
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
  const t = useT();
  const locale = useLocale();
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
  const measureAbout = useCallback((node: HTMLDivElement | null) => {
    if (node && !node.classList.contains('line-clamp-3')) return;
    if (node) setAboutClamped(node.scrollHeight > node.clientHeight + 1);
  }, []);
  const { user } = useSessionStore();

  /**
   * Hands off to the device's map app.
   *
   * Turn-by-turn navigation is not something a PWA should reimplement badly:
   * the native app has the GPS, the voice, and the traffic. The in-app preview
   * now lives in `RouteToPlace` below — a drawn line and a time, which is what
   * decides whether someone goes. This is the button for once they have.
   *
   * No `origin`: omitted, Google uses the device's own live position, which is
   * fresher than the coordinate we cached.
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
        {/*
          No photograph in the sheet: it is behind the sheet.

          `PlaceSheet` puts the gallery in the backdrop, so the smaller resting
          heights show the place rather than a dimmed list of other places —
          and dragging the sheet down reveals more of it, which is the whole
          reason a sheet stops short of the top. A copy of the cover inside the
          sheet would be the same photograph twice, 40px apart.
        */}
        {!compact && (
          <div className="relative">
            <PlaceGallery
              photos={place.images}
              name={place.name}
              categorySlug={place.category.slug}
              categoryColor={place.category.colorHex}
              priority
              className="aspect-[4/3] max-h-[38dvh] w-full rounded-lg shadow-md"
            />
            <span
              className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-white"
              style={{ backgroundColor: `${place.category.colorHex}e6` }}
            >
              {categoryName(place.category, locale)}
              {place.subcategory ? ` · ${place.subcategory.name}` : ''}
            </span>
          </div>
        )}

        {/* Hangs off the photo on the page; inline in the sheet, where there is
            nothing above it to overlap. */}
        <div
          className={cn(
            'bg-surface',
            compact ? 'px-5 pt-4' : 'relative mx-2 -mt-10 rounded-lg p-4 shadow-lg',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* On the page this rides on the photograph. In the sheet the
                  photograph is behind everything, so the category has to be
                  said here or not at all. */}
              {compact && (
                <span
                  className="mb-1.5 inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-white"
                  style={{ backgroundColor: `${place.category.colorHex}e6` }}
                >
                  {categoryName(place.category, locale)}
                  {place.subcategory ? ` · ${place.subcategory.name}` : ''}
                </span>
              )}

              <h1
                className={cn(
                  'text-primary leading-tight font-semibold tracking-tight',
                  compact ? 'text-2xl' : 'text-xl',
                )}
              >
                {place.name}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Rating value={place.averageRating} reviewCount={place.reviewCount} size="md" />
                {place.distanceM !== null && (
                  <span className="text-ink-muted inline-flex items-center gap-1 text-sm">
                    <Navigation className="size-3.5" aria-hidden />
                    {formatDistance(place.distanceM, locale)}
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
                <p className="text-ink-subtle text-[0.6875rem]">{t('detail.typical')}</p>
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
              {t('detail.getDirections')}
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
              aria-label={t('detail.share')}
              onClick={() => {
                void share();
              }}
              className="px-4"
            >
              <Share2 className="size-[1.125rem]" aria-hidden />
            </Button>
          </div>
        )}

        {/*
          The way out of the sheet and onto the page.

          Until this existed the full page had no route from anywhere a
          traveller goes — every card and every pin opens the sheet, and the
          page was reachable only from a shared link or the admin dashboard.
          It is the same content, so this is not "more detail"; it is a real
          URL, a browser back entry, and a screen that is not sharing space
          with whatever is behind it.
        */}
        {compact && (
          <Link
            href={`/place/${place.slug}`}
            className="bg-surface-sunken text-ink mt-3 flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-sm font-medium active:scale-[0.99]"
          >
            {t('detail.openFullPage')}
            <ChevronRight className="text-ink-subtle size-4 shrink-0" aria-hidden />
          </Link>
        )}

        <div className="border-border mt-5 space-y-4 border-t pt-4">
          <p className="text-ink-muted flex items-start gap-2 text-sm leading-relaxed">
            <MapPin className="text-ink-subtle mt-0.5 size-4 shrink-0" aria-hidden />
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
                  className="bg-surface-sunken text-ink inline-flex h-10 items-center gap-2 rounded-sm px-3.5 text-sm font-medium"
                >
                  <Phone className="size-4" aria-hidden />
                  {t('detail.call')}
                </a>
              )}
              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface-sunken text-ink inline-flex h-10 items-center gap-2 rounded-sm px-3.5 text-sm font-medium"
                >
                  <Globe className="size-4" aria-hidden />
                  {t('detail.website')}
                </a>
              )}
            </div>
          )}
        </div>

        {place.description && (
          <section className="border-border mt-5 border-t pt-4">
            <h2 className="text-ink text-sm font-semibold">{t('detail.about')}</h2>
            {/* Clamped by lines, and the toggle appears only when the text is
                actually clamped — measured, not guessed. A character-count
                threshold got this wrong immediately: a 145-character
                description wrapped to four lines, so it was cut with no way to
                expand it, which is the one outcome worse than showing it all.
                The measurement runs in a callback ref rather than an effect,
                so it happens when the node attaches instead of after a paint. */}
            {/* Rendered from Markdown into React elements, never through
                `dangerouslySetInnerHTML`. Descriptions are user-submitted and
                this page carries a session, so HTML from a client here would
                be a stored-XSS. Plain-text descriptions written before the
                editor existed render unchanged. */}
            <div ref={measureAbout} className={cn('mt-2', !aboutExpanded && 'line-clamp-3')}>
              <RichText source={place.description} />
            </div>
            {(aboutClamped || aboutExpanded) && (
              <button
                type="button"
                onClick={() => {
                  setAboutExpanded((open) => !open);
                }}
                className="text-primary mt-1 text-sm font-medium"
              >
                {aboutExpanded ? t('detail.showLess') : t('detail.readMore')}
              </button>
            )}
          </section>
        )}

        {/* Above the reviews on purpose. "Can I get there" is decided before
            "is it any good" — someone who has already read the rating is
            asking how far it is, not the other way round. */}
        <RouteToPlace place={place} />

        {/*
          What it looked like to somebody who went, immediately above what
          they said about it.

          This slot used to hold the listing's own photographs, which are now
          the gallery at the top of the screen — showing them twice cost a
          scroll to see the same pictures again. These are different pictures:
          not the ones chosen to sell the place, the ones taken in it.
        */}
        {place.reviewPhotos.length > 0 && (
          <section className="border-border mt-5 border-t pt-4">
            <h2 className="text-ink text-sm font-semibold">
              {t('photos.fromReviews')}
              <span className="text-ink-subtle ml-2 text-xs font-normal">
                {formatNumber(place.reviewPhotos.length, locale)}
              </span>
            </h2>

            {/* A row that scrolls, not a deck. The deck is one object you look
                through; this is a glance across several, and the reviews they
                came from are directly below. */}
            <ul className="scrollbar-none -mx-5 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
              {place.reviewPhotos.map((photo, position) => (
                <li key={photo.id} className="shrink-0 snap-start">
                  <div className="bg-surface-sunken relative size-28 overflow-hidden rounded-md">
                    <Image
                      src={photo.url}
                      alt={t('photos.position', {
                        current: position + 1,
                        total: place.reviewPhotos.length,
                        name: place.name,
                      })}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                </li>
              ))}
            </ul>
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
          {t('detail.reportListing')}
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
        <div className="pb-safe-float px-safe border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg gap-2">
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="border-border bg-surface text-ink inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-lg border text-[0.9375rem] font-medium active:scale-[0.98]"
              >
                <Phone className="size-[1.125rem]" aria-hidden />
                {t('detail.call')}
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
              {t('detail.directions')}
            </Button>
          </div>
        </div>
      )}

      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason={t('detail.signInToSave')}
      />
      <ReportSheet
        target={{ type: 'PLACE', id: place.id, label: place.name }}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </article>
  );
}
