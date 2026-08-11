'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Drawer } from 'vaul';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlaceDetailContent } from './PlaceDetailContent';
import { PlaceGallery } from './PlaceGallery';
import { PlaceImage } from './PlaceImage';
import { findCachedPlace, type PlacePreview } from '../cache';
import { usePlaceDetail } from '../hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { categoryName } from '@/features/categories/name';
import { ApiError } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { BottomSheet, SHEET_SNAP_POINTS } from '@/components/ui/BottomSheet';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import type { PlaceDetail } from '../api';

/**
 * The heights this sheet rests at, and the one it opens to.
 *
 * Change these two lines to change the sheet — everything else about resizing
 * lives in `BottomSheet`. The default opens at the middle stop, which must show
 * the name, rating, the directions button, the address *and* the opening
 * hours: that set is what lets someone decide without committing. Measured at
 * 0.42 the CTA fell below the fold, which turns a peek into a teaser.
 */
const SNAP_POINTS = SHEET_SNAP_POINTS;
const OPENS_AT = 1;

/**
 * Vaul's own curve, borrowed.
 *
 * The photograph and the sheet are two halves of one movement, and two curves
 * that are nearly the same is worse than two that are obviously different —
 * it reads as one of them lagging.
 */
const EASE = [0.32, 0.72, 0, 1] as const;

export interface PlaceSheetProps {
  placeId: string | null;
  onClose: () => void;
}

export function PlaceSheet({ placeId, onClose }: PlaceSheetProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const coordinates = useLocationStore((state) => state.coordinates);
  const { data, isPending, error } = usePlaceDetail(placeId, coordinates);

  /*
   * What the screen behind already knew about this place.
   *
   * Tapping a card used to open onto a pulsing grey rectangle and four grey
   * bars while a request went out — for a place whose photograph and name were
   * on screen, in the cache, a hundred milliseconds earlier. The sheet now
   * opens on that, and the fetched detail fills in the rest underneath it.
   *
   * Read once per place, during render, so the first painted frame already has
   * it; an effect would paint the grey frame first and then replace it, which
   * is the flash this removes.
   */
  const [preview, setPreview] = useState<{ id: string; place: PlacePreview | null } | null>(null);
  if (placeId !== null && preview?.id !== placeId) {
    setPreview({ id: placeId, place: findCachedPlace(queryClient, placeId) });
  }

  /*
   * The place that was on screen, kept for the length of the slide out.
   *
   * Dismissing sets `placeId` to null, which disables the query, which empties
   * `data` — a frame before the sheet has gone anywhere. The photograph and
   * every word in the sheet vanished at the top of the closing animation and
   * an empty white panel slid away, which is what made the dismissal read as
   * no animation at all.
   *
   * Only used while closing: opening a *different* place must show that
   * place's skeleton, not the last one's photographs under the new one's name.
   */
  const [lastPlace, setLastPlace] = useState<PlaceDetail | null>(null);

  // Adjusted during render rather than in an effect: React re-runs this
  // component immediately without painting the intermediate state, so the
  // sheet never shows a frame of the wrong place. An effect would both paint
  // that frame and trip the compiler's rule against it.
  if (data && data !== lastPlace) setLastPlace(data);

  const place = data ?? (placeId === null ? lastPlace : null);

  return (
    <>
      <Backdrop
        open={placeId !== null}
        place={place}
        preview={preview?.place ?? null}
        loading={placeId !== null && place === null}
        onClose={onClose}
      />

    <BottomSheet
      open={placeId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={SNAP_POINTS}
      defaultSnapIndex={OPENS_AT}
      /*
       * Closed by the button, not by getting rid of it.
       *
       * Dragging still moves between the resting heights — that is the whole
       * interaction — but a drag that runs off the bottom now springs back
       * instead of dismissing, and the photograph behind is not a dismiss
       * target either. Somewhere to put a thumb should not be a way to lose
       * your place.
       */
      dismissible={false}
      // Dimming is saved for full height, where the photo is covered anyway.
      // At the shorter stops the whole point is that you can see it.
      dimOnlyWhenFull
    >
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isPending && placeId !== null && <PlaceSheetSkeleton preview={preview?.place ?? null} />}

        {error && (
          <EmptyState
            title={
              error instanceof ApiError && error.status === 404
                ? t('place.gone')
                : t('place.loadFailed')
            }
            description={
              error instanceof ApiError && error.isRetryable
                ? t('place.checkConnection')
                : undefined
            }
            action={
              <Button variant="secondary" size="sm" onClick={onClose}>
                {t('common.close')}
              </Button>
            }
          />
        )}

        {place && (
          <>
            <Drawer.Title className="sr-only">{place.name}</Drawer.Title>
            <PlaceDetailContent place={place} compact />
          </>
        )}
      </div>
    </BottomSheet>
    </>
  );
}

/**
 * Whether there is a document to portal into.
 *
 * `useSyncExternalStore` with a constant subscription is the supported way to
 * ask "am I on the client?" without an effect that paints a frame first — the
 * server snapshot is false, the client snapshot is true, and React reconciles
 * the difference without a hydration warning.
 */
const subscribeToNothing = () => () => undefined;
const useIsClient = () => useSyncExternalStore(subscribeToNothing, () => true, () => false);

/**
 * The place, behind its own sheet.
 *
 * Portalled next to vaul's own portal rather than inside it. It lived inside
 * for one revision, and vaul's mounting owned it: the enter animation never
 * ran — the element sat at its `initial` values — and on close it was removed
 * outright, which is why dismissing looked like the sheet being switched off
 * rather than put away. Its own portal means its lifetime and its motion are
 * both decided here.
 *
 * `z-40` against the sheet's `z-50`: siblings under `body`, so the numbers
 * settle it. `pointer-events-auto` because vaul makes the page inert while the
 * sheet is open by setting `pointer-events: none` on `body`, and everything
 * that still needs a finger has to opt back in — without it this is a
 * photograph nobody can swipe.
 *
 * The scrim is not decoration. The dots sit at the top of the photograph and
 * the back button beside them, both white; over a pale photograph, with
 * nothing to sit on, neither is visible.
 */
function Backdrop({
  open,
  place,
  preview,
  loading,
  onClose,
}: {
  open: boolean;
  place: PlaceDetail | null;
  preview: PlacePreview | null;
  loading: boolean;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  if (!useIsClient()) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // `overflow-hidden` because the photograph inside is deliberately
          // wider than the viewport for the length of the movement.
          className="pointer-events-auto fixed inset-0 z-40 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.42, ease: EASE }}
        >
          {/*
            The photograph comes down as the sheet comes up.

            Two things moving toward each other read as one screen assembling;
            a photo that merely fades in reads as a background being switched
            on behind a panel. Separated from the fade above so the chrome —
            scrim, dots, the way out — stays where it is and only the picture
            travels.

            -4% against scale 1.09: the layer is 9% oversized, so it hangs 4.5%
            past each edge, and sliding it 4% down still leaves the bottom
            covered. Any smaller a scale and the movement tears a strip of
            empty page off the bottom of the screen.

            The timing is vaul's own — matching it is what makes the two read
            as one movement instead of two things happening near each other.
          */}
          <motion.div
            className="absolute inset-0"
            initial={reduceMotion ? { y: 0, scale: 1 } : { y: '-4%', scale: 1.09 }}
            animate={{ y: '0%', scale: 1 }}
            exit={reduceMotion ? { y: 0, scale: 1 } : { y: '-3%', scale: 1.07 }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: EASE }}
          >
            {place && (
              <PlaceGallery
                photos={place.images}
                name={place.name}
                categorySlug={place.category.slug}
                categoryColor={place.category.colorHex}
                priority
                className="absolute inset-0"
              />
            )}

            {/*
              The cover from the card that was tapped, over the gallery.

              Over rather than under, because the gallery carries its own opaque
              background and would hide anything beneath it the instant it
              mounts — which is the flash this exists to remove. On top, it
              simply fades away once the detail has landed, and since both are
              the same photograph, already decoded, the crossfade happens
              between two identical frames and cannot be seen.

              Inert while it fades: the gallery underneath owns the swipe from
              the moment it appears.
            */}
            <AnimatePresence>
              {!place && (
                <motion.div
                  /*
                    Opaque, because `PlaceImage`'s no-photo fallback is a wash
                    at 6–18% alpha — it is designed to tint a card's own
                    surface, not to be a surface. Without something behind it a
                    place with no photograph made this whole layer see-through
                    and the home screen showed through the sheet's backdrop.
                  */
                  className="bg-surface-sunken pointer-events-none absolute inset-0"
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
                >
                  {preview ? (
                    <PlaceImage
                      url={preview.coverImageUrl}
                      blurhash={preview.coverBlurhash}
                      name={preview.name}
                      categorySlug={preview.category.slug}
                      categoryColor={preview.category.colorHex}
                      sizes="100vw"
                      // Matches what `PlaceGallery` draws for a place with no
                      // photograph. The crossfade only disappears if the two
                      // frames are identical, and the glyph is part of the
                      // frame.
                      fallbackSize="lg"
                      priority
                    />
                  ) : (
                    /*
                     * The sunken surface, not `bg-ink`.
                     *
                     * Only reached for a place no screen has shown — a deep
                     * link, a cold start. It was near-black once, so every
                     * place flashed dark before its photograph arrived; a pale
                     * panel is the same skeleton the rest of the app uses.
                     */
                    <div
                      className={cn('bg-surface-sunken size-full', loading && 'animate-pulse')}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />

          {/* The way out, since the sheet no longer dismisses itself. Over the
              photograph rather than inside the sheet, so it stays put while the
              sheet is dragged between its heights. */}
          <div className="pt-safe-float absolute inset-x-0 top-0 px-4">
            <BackButton compact onClick={onClose} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Mirrors the real layout so the sheet does not reflow when data arrives.
 *
 * The two things at the top are not guesses — they are the category and the
 * name off the card that was tapped, which the screen behind was already
 * showing. Only what genuinely has to be fetched is drawn as a grey bar: the
 * rating, the address, the opening hours. A skeleton standing in for facts
 * already in hand is a loading state that is loading nothing.
 */
function PlaceSheetSkeleton({ preview }: { preview: PlacePreview | null }) {
  const locale = useLocale();

  return (
    <div className="px-5 pt-4">
      {preview ? (
        <>
          <span
            className="mb-1.5 inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-white"
            style={{ backgroundColor: `${preview.category.colorHex}e6` }}
          >
            {categoryName(preview.category, locale)}
          </span>
          {/* The heading and the sheet's accessible name are the same words, so
              they are the same element — while the detail loads there is
              otherwise nothing naming this sheet at all. */}
          <Drawer.Title className="text-primary text-2xl leading-tight font-semibold tracking-tight">
            {preview.name}
          </Drawer.Title>
        </>
      ) : (
        <>
          <div className="bg-surface-sunken h-5 w-24 animate-pulse rounded-full" />
          <div className="bg-surface-sunken mt-3 h-7 w-3/4 animate-pulse rounded" />
        </>
      )}

      <div className="mt-3 space-y-3">
        <div className="bg-surface-sunken h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-surface-sunken h-14 w-full animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
