'use client';

import { useEffect, useState, type ReactNode } from 'react';
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

/**
 * What is behind a sheet's content.
 *
 * `'texture'` — the app's soft relief, the same language as the wallpaper on
 * the screen behind. The default, because a sheet is a large plain surface and
 * that is what made it feel like an empty slab.
 *
 * `'plain'` — flat `bg-surface`. For a sheet whose own content is already
 * busy, or one that has to sit dead quiet behind something else.
 *
 * `{ image }` — any URL. The escape hatch, so swapping the artwork later is a
 * prop at the call site rather than an edit to this component. Keep it within
 * `#F4F4F6`–`#FFFFFF`: `public/sheet-backdrop.svg` explains why in full, but
 * the short version is that anything darker than the page tone breaks the
 * elevation ladder, and anything below `#F2F2F4` drops `ink-subtle` under AA.
 */
export type SheetBackdrop = 'texture' | 'plain' | { image: string };

/**
 * Where the grab handle sits.
 *
 * `'inline'` — in a 16px strip above the content. The default, and right for a
 * form: nothing scrolls past it, so there is nothing for it to be in the way
 * of.
 *
 * `'over-content'` — floating on the sheet's own surface, taking no space in
 * the flow. For a sheet with a long scroll: inline, the strip is a band the
 * content cannot enter, so text is guillotined 16px below the sheet's edge
 * with an empty white lid above the cut. Floating, the scroller reaches the
 * sheet's own rim and text slides *under* the handle, which is what a sheet
 * edge should look like.
 *
 * **The caller owes it the space back.** Nothing is reserved in the flow, so
 * the scrolling child needs `pt-4` of its own — that is what holds the first
 * line clear of the pill at rest while still letting it scroll beneath.
 * Padding on the scroller, not on anything above it: padding above the
 * scroller is another band, which is the thing being removed.
 *
 * `'over-media'` — floating over an edge-to-edge photograph. A white pill with
 * a hard shadow, because its legibility cannot depend on what the picture
 * happens to be. Same flow rules as `'over-content'`.
 */
export type SheetHandle = 'inline' | 'over-content' | 'over-media';

/**
 * A custom image overrides only the picture.
 *
 * Where it sits and how it is scaled belong to `.sheet-texture` in
 * globals.css — that class is applied either way, and the inline
 * `background-image` beats it. So the placement rules have one definition, and
 * swapping the artwork cannot accidentally swap the behaviour with it.
 */
function backdropStyle(backdrop: SheetBackdrop): React.CSSProperties {
  return typeof backdrop === 'object' ? { backgroundImage: `url('${backdrop.image}')` } : {};
}

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

  /** Where the grab handle sits. See `SheetHandle`. Defaults to `'inline'`. */
  handle?: SheetHandle | undefined;

  /**
   * Dim the background only once the sheet is at its tallest.
   * A resizable sheet's smaller stops exist so the screen behind stays legible
   * and usable; dimming it there defeats the reason for stopping short.
   */
  dimOnlyWhenFull?: boolean | undefined;

  /**
   * Only closed by something that calls `onOpenChange` — not by dragging it
   * away, not by pressing the page behind it.
   *
   * Dragging between snap points still works; the drag simply springs back
   * instead of dismissing. For sheets where losing your place by resting a
   * thumb in the wrong spot is worse than the extra tap on a button.
   */
  dismissible?: boolean | undefined;

  /** What is behind the content. See `SheetBackdrop`. Defaults to `'texture'`. */
  backdrop?: SheetBackdrop | undefined;

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
  handle = 'inline',
  dimOnlyWhenFull = false,
  dismissible = true,
  backdrop = 'texture',
  children,
  className,
}: BottomSheetProps) {
  const stops = snapPoints ? [...snapPoints] : null;
  const initialIndex =
    defaultSnapIndex ?? (stops ? Math.min(Math.floor(stops.length / 2), stops.length - 1) : 0);

  const [snap, setSnap] = useState<number | string | null>(stops?.[initialIndex] ?? null);

  /*
   * Whether the sheet's content has been scrolled off its top.
   *
   * Only the floating handle cares. Transparent, it stops hiding a band of
   * content — but the pill itself then sits on whatever passes under it, and a
   * grabber lying across the middle of a word is a worse kind of covering than
   * the one being removed. So it fades the moment the content starts moving
   * and comes back when you return to the top, which is also the only moment
   * the affordance is worth anything: at rest it says "this can be dragged".
   *
   * `onScrollCapture` on the panel rather than a ref into the caller's
   * scroller. Scroll events do not bubble, but they do capture, so this hears
   * every descendant without the component having to know which child scrolls
   * — and that child belongs to the call site, not to this file.
   */
  const [scrolled, setScrolled] = useState(false);

  /*
   * Escape still closes an undismissable sheet.
   *
   * `dismissible={false}` is there to stop a sheet being lost to a stray drag
   * or a tap behind it — not to trap anyone inside it, and vaul takes Escape
   * away along with the rest. Escape is the keyboard's version of the close
   * button, so it is put back by hand.
   *
   * Guarded on being the topmost sheet: this one can have another open over it
   * — the auth sheet, the report sheet — and that one owns the key.
   */
  useEffect(() => {
    if (!open || dismissible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelectorAll('[data-vaul-drawer][data-state="open"]').length > 1) return;
      onOpenChange(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dismissible, onOpenChange]);

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
      dismissible={dismissible}
      {...(stops ? { snapPoints: stops, activeSnapPoint: snap, setActiveSnapPoint: setSnap } : {})}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          // Dims the app, not the browser page. On a desktop the app is a
          // centred column, and a scrim that also darkened the gutters would
          // say the sheet belongs to the window rather than to the app.
          className="max-w-app bg-ink/40 fixed inset-x-0 inset-y-0 z-50 mx-auto backdrop-blur-[2px] transition-opacity"
          style={{ opacity: dimmed ? 1 : 0, pointerEvents: dimmed ? 'auto' : 'none' }}
        />

        <Drawer.Content
          // Vaul focuses the panel on open to trap focus, and the global
          // :focus-visible rule would then ring the whole sheet. Children keep
          // their own rings.
          className={cn(
            'px-safe max-w-app bg-surface shadow-sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex flex-col rounded-t-xl focus:outline-none',
            // A resizable sheet is sized by its snap point, so it needs a fixed
            // height to measure against; a content sheet grows to fit and stops
            // short of the top.
            stops ? 'h-[95dvh] overflow-hidden' : 'max-h-[92dvh]',
            backdrop !== 'plain' && 'sheet-texture',
            className,
          )}
          // On the panel itself rather than a layer inside it: an element's own
          // background is painted under its content by definition, so there is
          // no z-index to argue with and nothing for vaul's drag handling to
          // trip over.
          style={backdropStyle(backdrop)}
          onScrollCapture={(event) => {
            setScrolled((event.target as HTMLElement).scrollTop > 4);
          }}
        >
          {/*
            `Drawer.Handle`, not a decorative div, and it must own its pixels.
            An earlier version was `pointer-events-none`, which left the top of
            the sheet belonging to the scroll container underneath: vaul read
            every upward drag there as "scroll the content", so the sheet could
            be dragged shorter but never taller. Half a control.

            The wrapper does the positioning, not the handle: vaul sets
            `position: relative` on Handle itself with enough specificity to
            beat a utility class, so styling it `absolute` silently failed and
            it took 36px of flow — putting a strip back above the content,
            which is the whole thing these two variants exist to remove.
          */}
          {handle === 'over-media' && (
            // The pill carries its own shadow rather than sitting on a scrim,
            // which on a pale photo looked like a shadow cast into the sheet.
            <div className="absolute inset-x-0 top-0 z-10">
              <Drawer.Handle className="!my-0 !h-9 !w-full !rounded-none !bg-transparent before:absolute before:inset-x-0 before:top-2.5 before:mx-auto before:h-1 before:w-10 before:rounded-full before:bg-white/90 before:shadow-[0_1px_4px_rgb(0_0_0/0.5)] before:content-['']" />
            </div>
          )}

          {handle === 'over-content' && (
            /*
              Transparent, over the sheet's own surface — no strip, so the
              scroller reaches the sheet's rim and text passes beneath.

              The pill is darker than the inline one and carries a white ring,
              because it now has to read against two different things: the
              sheet's own surface at rest, and whatever scrolls beneath it. On
              this screen that includes a route map and a review photograph.
              `bg-border` on white was quiet enough; over a picture it was two
              mid-greys with nothing between them. Ink at 25% holds its own on
              white, and the 2px halo in the sheet's colour cuts it out from
              anything darker — which is the same job the media variant does
              with a shadow, minus the shadow that would read as the pill
              hovering above the sheet rather than lying on it.

              A 36px target, not the 4px of the pill: the grabber is a control
              and has to be grabbable, and the strip below it is the part of a
              sheet a thumb actually lands on.
            */
            <div
              className={cn(
                'absolute inset-x-0 top-0 z-10 transition-opacity duration-200',
                // Opacity only — never `hidden` or `pointer-events-none`. The
                // strip stays the sheet's drag target whether or not the pill
                // is drawn, which is the mistake an earlier version of the
                // media handle made: without its pixels, vaul read every
                // upward drag at the top of the sheet as "scroll the content"
                // and the sheet could be made shorter but never taller.
                scrolled ? 'opacity-0' : 'opacity-100',
              )}
            >
              <Drawer.Handle className="before:bg-ink/25 !my-0 !h-9 !w-full !rounded-none !bg-transparent before:absolute before:inset-x-0 before:top-3 before:mx-auto before:h-1 before:w-10 before:rounded-full before:shadow-[0_0_0_2px_var(--color-surface)] before:content-['']" />
            </div>
          )}

          {handle === 'inline' && (
            <div className="bg-border mx-auto mt-3 h-1 w-10 shrink-0 rounded-full" />
          )}

          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
