'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { PlaceDetailContent } from './PlaceDetailContent';
import { usePlaceDetail } from '../hooks/usePlaces';
import { useLocationStore } from '@/features/location/store';
import { ApiError } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * Snap points: peek, then full (§13).
 *
 * Peek must show the hero, name, rating *and* the directions button — that set
 * is what lets someone decide without committing. Measured at 0.42 the CTA fell
 * below the fold, which turns a peek into a teaser and forces a drag before the
 * sheet is useful. Raised from 0.56 to 0.7: the address and opening hours now
 * clear the fold too, so the peek answers "should I go" and not merely "what is
 * this".
 */
const SNAP_POINTS = [0.7, 0.95];

export interface PlaceSheetProps {
  placeId: string | null;
  onClose: () => void;
}

export function PlaceSheet({ placeId, onClose }: PlaceSheetProps) {
  const coordinates = useLocationStore((state) => state.coordinates);
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]!);

  const { data: place, isPending, error } = usePlaceDetail(placeId, coordinates);

  return (
    <Drawer.Root
      open={placeId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
        // Reopening should start at peek, not wherever the last sheet was left.
        else setSnap(SNAP_POINTS[0]!);
      }}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <Drawer.Portal>
        {/* No overlay at peek height: the map behind stays legible and
            interactive, which is the entire reason for a peek state. */}
        <Drawer.Overlay
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] transition-opacity"
          style={{ opacity: snap === SNAP_POINTS[1] ? 1 : 0, pointerEvents: snap === SNAP_POINTS[1] ? 'auto' : 'none' }}
        />
        <Drawer.Content
          // The sheet is a container, not a control. Vaul focuses it on open to
          // trap focus, and the global :focus-visible ring then draws an
          // outline around the whole panel. Its children keep their own rings.
          //
          // `overflow-hidden` is what lets the photo inherit the sheet's own
          // rounded top corners instead of poking square ones through them.
          className="fixed inset-x-0 bottom-0 z-50 flex h-[95dvh] flex-col overflow-hidden rounded-t-xl bg-surface shadow-sheet focus:outline-none"
        >
          {/*
            The handle floats over the photo rather than sitting in a strip
            above it, so the sheet's top edge and the image read as one
            surface rather than two stacked panels.

            It carries its own drop shadow instead of sitting on a scrim. A
            full-width gradient band did keep it legible on a bright photo,
            but on a pale one it read as an inset shadow along the top of the
            sheet — the sheet looked pressed into the screen instead of
            floating above it. A shadow on the handle alone survives both.

            There is no close button. Dragging down and tapping the overlay
            both already dismiss it, and a floating X over the photo is one
            more thing between the reader and the place.
          */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2.5">
            <span className="h-1 w-10 rounded-full bg-white/90 shadow-[0_1px_4px_rgb(0_0_0/0.5)]" />
          </div>

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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Mirrors the real layout so the sheet does not reflow when data arrives. */
function PlaceSheetSkeleton() {
  return (
    <div>
      <div className="h-40 w-full animate-pulse bg-surface-sunken" />
      <div className="space-y-3 px-5 pt-4">
        <div className="h-5 w-24 animate-pulse rounded-full bg-surface-sunken" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-surface-sunken" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-sunken" />
        <div className="h-14 w-full animate-pulse rounded-lg bg-surface-sunken" />
      </div>
    </div>
  );
}
