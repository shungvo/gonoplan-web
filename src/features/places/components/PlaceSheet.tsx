'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from 'vaul';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PlaceDetailContent } from './PlaceDetailContent';
import { PlaceGallery } from './PlaceGallery';
import { usePlaceDetail } from '../hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { ApiError } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { BottomSheet, SHEET_SNAP_POINTS } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n/I18nProvider';
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

export interface PlaceSheetProps {
  placeId: string | null;
  onClose: () => void;
}

export function PlaceSheet({ placeId, onClose }: PlaceSheetProps) {
  const t = useT();
  const coordinates = useLocationStore((state) => state.coordinates);
  const { data, isPending, error } = usePlaceDetail(placeId, coordinates);

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
        {isPending && placeId !== null && <PlaceSheetSkeleton />}

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
  loading,
  onClose,
}: {
  open: boolean;
  place: PlaceDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  if (!useIsClient()) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-40"
          /*
           * Settles rather than appears. The sheet slides up over a backdrop
           * that is coming to rest, which is the arrangement being imitated;
           * 1.06 is small enough to be felt rather than watched.
           *
           * The timing is vaul's own — matching it is what makes the two read
           * as one movement instead of two things happening near each other.
           */
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.32, 0.72, 0, 1] }}
        >
          {place ? (
            <PlaceGallery
              photos={place.images}
              name={place.name}
              categorySlug={place.category.slug}
              categoryColor={place.category.colorHex}
              priority
              className="size-full"
            />
          ) : (
            /*
             * The sunken surface, not `bg-ink`.
             *
             * This is the first thing on screen while the detail loads, and it
             * was near-black — so every place flashed dark before its
             * photograph arrived. A pale panel is the same skeleton the rest of
             * the app uses, and the flash stops being a flash. Second and later
             * openings never reach here: the detail is cached for a minute.
             */
            <div className={cn('bg-surface-sunken size-full', loading && 'animate-pulse')} />
          )}

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

/** Mirrors the real layout so the sheet does not reflow when data arrives. */
function PlaceSheetSkeleton() {
  return (
    <div>
      <div className="space-y-3 px-5 pt-4">
        <div className="bg-surface-sunken h-5 w-24 animate-pulse rounded-full" />
        <div className="bg-surface-sunken h-7 w-3/4 animate-pulse rounded" />
        <div className="bg-surface-sunken h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-surface-sunken h-14 w-full animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
