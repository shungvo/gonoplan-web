'use client';

import { useState } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'motion/react';
import { MapPin } from 'lucide-react';

import { PlaceImage } from './PlaceImage';
import { formatDistance } from '@/lib/geo/grid';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatRating } from '@/i18n/format';
import { categoryName } from '@/features/categories/name';
import { cn } from '@/lib/utils/cn';
import type { PlaceCard } from '../api';

/** Active card plus the two peeking behind it. More reads as clutter. */
const VISIBLE = 3;

/**
 * How far a drag must travel to count as "next".
 *
 * Deliberately short. A stack that needs a long swipe feels stuck, and the
 * gesture competes with the vertical page scroll it sits inside — the sooner
 * the intent is resolved, the less the two fight.
 */
const SWIPE_THRESHOLD_PX = 56;

/** A flick this fast counts regardless of how far it travelled. */
const FLICK_VELOCITY = 400;

/**
 * What a finished drag means: next, previous, or nothing.
 *
 * Pulled out as a pure function because it is the one part of the gesture that
 * is ours. Everything else — hit testing, pointer capture, momentum — belongs
 * to `motion` and is exercised by a real finger, which a headless browser
 * cannot reproduce faithfully. This can be tested directly, so it is.
 */
export function swipeIntent(offsetX: number, velocityX: number): -1 | 0 | 1 {
  const flicked = Math.abs(velocityX) > FLICK_VELOCITY;

  // Distance and direction must agree. A drag left that is released while the
  // finger is already travelling back right is an abandoned gesture, not a
  // slow "next".
  if (offsetX <= -SWIPE_THRESHOLD_PX || (flicked && velocityX < 0 && offsetX < 0)) return 1;
  if (offsetX >= SWIPE_THRESHOLD_PX || (flicked && velocityX > 0 && offsetX > 0)) return -1;
  return 0;
}

/** Each slot sits further back and lower, so only its bottom edge shows. */
const SLOT = [
  { scale: 1, y: 0 },
  { scale: 0.945, y: 14 },
  { scale: 0.89, y: 27 },
] as const;

export interface PlaceCardStackProps {
  places: PlaceCard[] | undefined;
  isPending?: boolean;
  onSelect?: (place: PlaceCard) => void;
  className?: string;
}

/**
 * A swipeable stack of recommendations.
 *
 * A stack rather than a rail because these are not a list to scan — they are a
 * short queue of "here is one place, is it for you?". The shape says so: one
 * card at a time, full attention, the next one visibly waiting underneath.
 *
 * The cards behind are real cards, not a drawn shadow. Faking the depth with a
 * static border means the illusion collapses the moment the top card moves,
 * which is exactly when someone is looking at it.
 */
export function PlaceCardStack({
  places,
  isPending = false,
  onSelect,
  className,
}: PlaceCardStackProps) {
  const t = useT();
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  if (isPending) {
    return (
      <div className={cn('px-5', className)}>
        <div className="bg-surface-sunken h-56 w-full animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!places || places.length === 0) return null;

  const total = places.length;
  const depth = Math.min(VISIBLE, total);
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 38 };

  const advance = (direction: 1 | -1) => {
    setIndex((current) => (current + direction + total) % total);
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const intent = swipeIntent(info.offset.x, info.velocity.x);
    if (intent !== 0) advance(intent);
  };

  // Built back-to-front so the active card paints last and sits on top without
  // anyone having to reason about z-index.
  const slots = Array.from({ length: depth }, (_, slot) => ({
    slot,
    place: places[(index + slot) % total]!,
  })).reverse();

  return (
    <div className={cn('px-5', className)}>
      {/* Announced, not drawn. The dots are a visual cue only, and a card
          silently replacing another says nothing to a screen reader. */}
      <span className="sr-only" aria-live="polite">
        {places[index]?.name}, recommendation {index + 1} of {total}
      </span>

      {/* Room for the deepest card's offset, or the stack clips its own base. */}
      <div className="relative h-56" style={{ paddingBottom: SLOT[VISIBLE - 1]?.y }}>
        {slots.map(({ slot, place }) => {
          const isActive = slot === 0;
          const geometry = SLOT[slot] ?? SLOT[SLOT.length - 1]!;

          return (
            <motion.div
              key={place.id}
              className="absolute inset-x-0 top-0"
              animate={{ scale: geometry.scale, y: geometry.y }}
              transition={transition}
              style={{ zIndex: depth - slot }}
              // Only the front card is draggable; the ones behind are scenery.
              drag={isActive && total > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.55}
              // Always attached: `undefined` is not assignable under
              // exactOptionalPropertyTypes, and a card that cannot be dragged
              // never fires it anyway.
              onDragEnd={handleDragEnd}
            >
              <button
                type="button"
                // The cards behind are decorative duplicates of rows that appear
                // again below; exposing them would make the screen read twice.
                {...(isActive
                  ? {
                      'aria-label': t('stack.cardLabel', {
                        name: place.name,
                        position: index + 1,
                        total,
                      }),
                    }
                  : { tabIndex: -1, 'aria-hidden': true })}
                /*
                 * Arrow keys replace the Previous and Next buttons that used to
                 * sit under the stack. The buttons were the only route in for a
                 * keyboard — a drag gesture is not an interface on its own — so
                 * removing them without this would have made the stack reachable
                 * by mouse and finger only.
                 */
                onKeyDown={(event) => {
                  if (!isActive || total < 2) return;
                  if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    advance(1);
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    advance(-1);
                  }
                }}
                onClick={() => {
                  if (isActive) onSelect?.(place);
                }}
                className={cn(
                  'relative block h-48 w-full overflow-hidden rounded-lg text-left shadow-lg',
                  // Opaque, and not optionally. A stack is only a stack if the
                  // front card hides the ones behind it — without a background
                  // the category-tinted placeholder let all three titles
                  // composite into one another and the card read as a smear.
                  // A real photograph would have masked this until the first
                  // place without one arrived.
                  'bg-surface-sunken',
                  // Dragging must not also feel like a tap in progress.
                  isActive && 'cursor-grab active:cursor-grabbing',
                )}
              >
                <PlaceImage
                  url={place.coverImageUrl}
                  blurhash={place.coverBlurhash}
                  name={place.name}
                  categorySlug={place.category.slug}
                  categoryColor={place.category.colorHex}
                  sizes="(max-width: 640px) 100vw, 600px"
                  priority={isActive}
                  fallbackSize="lg"
                />

                {/* The scrim is the only reason white text over an unknown
                    photograph is safe. Without it the name is legible on a
                    dusk shot and invisible on a beach. */}
                <span className="from-ink/80 via-ink/25 absolute inset-0 bg-gradient-to-t to-transparent" />

                <span className="absolute inset-x-4 bottom-3.5">
                  <span className="block truncate text-lg leading-tight font-semibold text-white">
                    {place.name}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-white/85">
                    <span>{categoryName(place.category, locale)}</span>
                    {place.distanceM !== null && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden />
                          {formatDistance(place.distanceM, locale)}
                        </span>
                      </>
                    )}
                    {place.reviewCount > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{formatRating(place.averageRating, locale)}★</span>
                      </>
                    )}
                  </span>
                </span>

                {/* Position marker, top-left, over the photo — matches where the
                    eye already is when the card changes. */}
                {isActive && total > 1 && (
                  <span className="absolute top-3.5 left-4 flex gap-1" aria-hidden>
                    {places.slice(0, Math.min(total, 6)).map((dot, dotIndex) => (
                      <span
                        key={dot.id}
                        className={cn(
                          'h-1 rounded-full transition-all duration-200',
                          dotIndex === index ? 'w-5 bg-white' : 'w-2 bg-white/50',
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
