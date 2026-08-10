'use client';

import { Drawer } from 'vaul';
import { PlaceDetailContent } from './PlaceDetailContent';
import { usePlaceDetail } from '../hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { ApiError } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { BottomSheet, SHEET_SNAP_POINTS } from '@/components/ui/BottomSheet';

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
      // The photo runs to the sheet's own rounded top, so the handle has to
      // float over it rather than sit in a strip above it.
      floatingHandle
      // The map or list behind stays legible and usable at the shorter stops —
      // that is the entire reason for stopping short of full height.
      dimOnlyWhenFull
    >
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isPending && <PlaceSheetSkeleton />}

        {error && (
          <EmptyState
            title={
              error instanceof ApiError && error.status === 404
                ? 'This place is no longer available'
                : 'Could not load this place'
            }
            description={
              error instanceof ApiError && error.isRetryable
                ? 'Check your connection and try again.'
                : undefined
            }
            action={
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
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

/** Mirrors the real layout so the sheet does not reflow when data arrives. */
function PlaceSheetSkeleton() {
  return (
    <div>
      <div className="bg-surface-sunken h-48 w-full animate-pulse" />
      <div className="space-y-3 px-5 pt-4">
        <div className="bg-surface-sunken h-5 w-24 animate-pulse rounded-full" />
        <div className="bg-surface-sunken h-7 w-3/4 animate-pulse rounded" />
        <div className="bg-surface-sunken h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-surface-sunken h-14 w-full animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
