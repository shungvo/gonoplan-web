'use client';

import { Drawer } from 'vaul';
import { motion, useReducedMotion } from 'motion/react';
import { PlaceDetailContent } from './PlaceDetailContent';
import { PlaceGallery } from './PlaceGallery';
import { usePlaceDetail } from '../hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { ApiError } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BottomSheet, SHEET_SNAP_POINTS } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n/I18nProvider';
import type { PlaceDetail } from '../api';

/**
 * The heights this sheet rests at, and the one it opens to.
 *
 * Change these two lines to change the sheet — everything else about resizing
 * lives in `BottomSheet`. The default opens at the middle stop, which must show
 * the hero, name, rating, the directions button, the address *and* the opening
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
  const { data: place, isPending, error } = usePlaceDetail(placeId, coordinates);

  return (
    <BottomSheet
      open={placeId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={SNAP_POINTS}
      defaultSnapIndex={OPENS_AT}
      // The photographs, behind everything. See `Backdrop`.
      backdrop={place ? <Backdrop place={place} /> : <div className="bg-ink size-full" />}
      // Dimming is saved for full height, where the photo is covered anyway.
      // At the shorter stops the whole point is that you can see it.
      dimOnlyWhenFull
    >
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isPending && <PlaceSheetSkeleton />}

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
  );
}

/**
 * The place, behind its own sheet.
 *
 * Scaled in rather than cut in: a photograph that simply appears reads as a
 * page swap, and the sheet sliding up over a still backdrop is exactly the
 * arrangement this is meant to look like on a phone. 1.06 is small enough to
 * be felt rather than seen.
 *
 * The scrim is not decoration. The dots sit at the top of the photograph and
 * the sheet's handle at the bottom of it, and both are white — over a pale
 * photograph, without something to sit on, neither is visible.
 */
function Backdrop({ place }: { place: PlaceDetail }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative size-full"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
    >
      <PlaceGallery
        photos={place.images}
        name={place.name}
        categorySlug={place.category.slug}
        categoryColor={place.category.colorHex}
        priority
        className="size-full"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
    </motion.div>
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
