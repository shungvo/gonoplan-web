'use client';

import { useState, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils/cn';

/**
 * Heights a resizable sheet can rest at, as fractions of its own height.
 *
 * Three stops rather than two. With only "peek" and "full", dragging down from
 * peek has nowhere to go and dismisses the sheet, so the gesture can only ever
 * make it bigger — half a control. The extra stop below makes "shorter" a real
 * outcome and dismissal something you have to mean.
 *
 * Fractions of the sheet, not the viewport: vaul measures snap points against
 * the content box, so a sheet capped at 95dvh rests at 0.7 × 95dvh ≈ 66% of
 * the screen.
 */
export const SHEET_SNAP_POINTS = [0.45, 0.7, 0.95] as const;

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Make the sheet resizable by drag, resting at these fractions.
   * Omit for a sheet that simply hugs its content — a form has one useful
   * height, and offering to resize it is a control with nothing behind it.
   */
  snapPoints?: readonly number[] | undefined;

  /** Which stop to open at. Defaults to the middle one, or the first if there are two. */
  defaultSnapIndex?: number | undefined;

  /**
   * Draw the handle over the content rather than in a strip above it.
   * For sheets whose first element is edge-to-edge media: a white strip above
   * a photo reads as two stacked panels with a seam between them.
   */
  floatingHandle?: boolean | undefined;

  /**
   * Dim the background only once the sheet is at its tallest.
   * A resizable sheet's smaller stops exist so the screen behind stays legible
   * and usable; dimming it there defeats the reason for stopping short.
   */
  dimOnlyWhenFull?: boolean | undefined;

  children: ReactNode;
  className?: string | undefined;
}

/**
 * The app's bottom sheet.
 *
 * Wraps vaul so that every sheet gets the same chrome, and so that "how tall is
 * it?" is a prop rather than a constant buried in whichever component happened
 * to need one. Four sheets were repeating the same forty-character class string
 * before this; that is how they drift.
 */
export function BottomSheet({
  open,
  onOpenChange,
  snapPoints,
  defaultSnapIndex,
  floatingHandle = false,
  dimOnlyWhenFull = false,
  children,
  className,
}: BottomSheetProps) {
  const stops = snapPoints ? [...snapPoints] : null;
  const initialIndex =
    defaultSnapIndex ?? (stops ? Math.min(Math.floor(stops.length / 2), stops.length - 1) : 0);

  const [snap, setSnap] = useState<number | string | null>(stops?.[initialIndex] ?? null);

  const isFull = stops !== null && snap === stops[stops.length - 1];
  const dimmed = !dimOnlyWhenFull || isFull;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        // Reopening starts at the configured stop rather than wherever the
        // last sheet was left — a sheet that opens at whatever height the
        // previous, unrelated place was dragged to feels broken.
        if (next && stops) setSnap(stops[initialIndex] ?? stops[0]!);
        onOpenChange(next);
      }}
      {...(stops
        ? { snapPoints: stops, activeSnapPoint: snap, setActiveSnapPoint: setSnap }
        : {})}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] transition-opacity"
          style={{ opacity: dimmed ? 1 : 0, pointerEvents: dimmed ? 'auto' : 'none' }}
        />

        <Drawer.Content
          // Vaul focuses the panel on open to trap focus, and the global
          // :focus-visible rule would then ring the whole sheet. Children keep
          // their own rings.
          className={cn(
            'px-safe fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl bg-surface shadow-sheet focus:outline-none',
            // A resizable sheet is sized by its snap point, so it needs a fixed
            // height to measure against; a content sheet grows to fit and stops
            // short of the top.
            stops ? 'h-[95dvh] overflow-hidden' : 'max-h-[92dvh]',
            className,
          )}
        >
          {floatingHandle ? (
            /*
              `Drawer.Handle`, not a decorative div, and it must own its pixels.
              An earlier version was `pointer-events-none`, which left the top
              of the sheet belonging to the scroll container underneath: vaul
              read every upward drag there as "scroll the content", so the
              sheet could be dragged shorter but never taller. Half a control.

              The wrapper does the positioning, not the handle: vaul sets
              `position: relative` on Handle itself with enough specificity to
              beat a utility class, so styling it `absolute` silently failed
              and it took 36px of flow — putting the white strip back above the
              photo, which is the seam this whole arrangement exists to remove.

              The pill carries its own shadow rather than sitting on a scrim,
              which on a pale photo looked like a shadow cast into the sheet.
            */
            <div className="absolute inset-x-0 top-0 z-10">
              <Drawer.Handle className="!my-0 !h-9 !w-full !rounded-none !bg-transparent before:absolute before:inset-x-0 before:top-2.5 before:mx-auto before:h-1 before:w-10 before:rounded-full before:bg-white/90 before:shadow-[0_1px_4px_rgb(0_0_0/0.5)] before:content-['']" />
            </div>
          ) : (
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" />
          )}

          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
