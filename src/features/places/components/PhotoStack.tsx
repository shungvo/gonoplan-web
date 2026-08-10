'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { swipeIntent } from './PlaceCardStack';
import { cn } from '@/lib/utils/cn';

export interface StackPhoto {
  id: string;
  url: string;
  blurhash?: string | null | undefined;
}

/** Three is all that is ever visible; drawing forty would cost forty layers. */
const VISIBLE_DEPTH = 3;

/**
 * A place's photos, as a swipeable deck.
 *
 * The same gesture and the same `swipeIntent` as the recommendation stack —
 * imported rather than reimplemented, because two copies of a threshold is two
 * thresholds that drift, and this one has already been tuned against a real
 * finger.
 *
 * A deck rather than a horizontal strip: a strip of photos next to a strip of
 * category chips next to a strip of review cards turns the whole page into
 * things that slide sideways, and the reader stops being able to tell which
 * strip they are in. A deck reads as one object.
 */
export function PhotoStack({
  photos,
  className,
  alt,
}: {
  photos: StackPhoto[];
  className?: string;
  /** Names the subject, since the photos themselves carry no description. */
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          'bg-surface-sunken text-ink-subtle flex h-56 flex-col items-center justify-center gap-2 rounded-lg',
          className,
        )}
      >
        <ImageOff className="size-6" aria-hidden />
        <p className="text-xs">No photos yet</p>
      </div>
    );
  }

  const total = photos.length;
  const go = (delta: number) => {
    setIndex((current) => (current + delta + total) % total);
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const intent = swipeIntent(info.offset.x, info.velocity.x);
    if (intent !== 0) go(intent);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Fixed height, so the page does not reflow as a portrait photo follows
          a landscape one — a layout that jumps under the reader's thumb is
          worse than one that crops. */}
      <div className="relative h-60">
        {photos.map((photo, position) => {
          // Distance forward from the current card, wrapping — which is what
          // makes the deck endless in both directions.
          const depth = (position - index + total) % total;
          if (depth >= VISIBLE_DEPTH) return null;

          const isActive = depth === 0;

          return (
            <motion.div
              key={photo.id}
              className="bg-surface-sunken absolute inset-0 overflow-hidden rounded-lg shadow-md"
              // Only the front photo is draggable; the ones behind are scenery.
              drag={isActive && total > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.55}
              // Spread rather than a ternary to `undefined`: under
              // exactOptionalPropertyTypes an explicit undefined is not the
              // same as an absent prop, and motion's type demands the handler.
              {...(isActive ? { onDragEnd: handleDragEnd } : {})}
              animate={{
                // Each card behind sits slightly lower and narrower, which is
                // what reads as depth without a perspective transform.
                scale: 1 - depth * 0.05,
                y: depth * 10,
                zIndex: total - depth,
                opacity: depth === VISIBLE_DEPTH - 1 ? 0.6 : 1,
              }}
              transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32 }
              }
            >
              {/* The sunken surface shows through until the file arrives —
                  these are full-size photos on a mobile connection. The
                  `blurhash` column is populated but nothing in the app renders
                  it yet, here or in `PlaceImage`. */}
              <Image
                src={photo.url}
                alt={`${alt} — photo ${String(position + 1)} of ${String(total)}`}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                // Only the front photo is worth fetching eagerly; the two
                // behind it are 40 pixels of edge until they are swiped to.
                priority={depth === 0}
                className="object-cover"
                draggable={false}
              />
            </motion.div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          {/*
            Buttons as well as the gesture.

            A swipe is not an interface on its own: it is invisible, and it is
            unavailable to anyone using a keyboard or a switch. These are the
            same action with a name attached.
          */}
          {/* Above the deck. The cards carry an explicit `zIndex` from their
              animation, so anything meant to float over them needs one too —
              without it these were painted behind the front photo, which made
              them invisible *and* unclickable. */}
          <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-between px-2">
            {[
              { delta: -1, label: 'Previous photo', Icon: ChevronLeft },
              { delta: 1, label: 'Next photo', Icon: ChevronRight },
            ].map(({ delta, label, Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  go(delta);
                }}
                aria-label={label}
                className="bg-surface/90 text-ink pointer-events-auto flex size-9 items-center justify-center rounded-full shadow-md backdrop-blur-sm active:scale-95"
              >
                <Icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            {photos.map((photo, position) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => {
                  setIndex(position);
                }}
                aria-label={`Photo ${String(position + 1)}`}
                aria-current={position === index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  position === index ? 'bg-primary w-5' : 'bg-border w-1.5',
                )}
              />
            ))}
          </div>

          {/* Screen readers get the position as text; the dots above are
              decorative to them. */}
          <p className="sr-only" aria-live="polite">
            Photo {index + 1} of {total}
          </p>
        </>
      )}
    </div>
  );
}
