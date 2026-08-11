'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { PlaceImage } from './PlaceImage';
import { swipeIntent } from './PlaceCardStack';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';

export interface GalleryPhoto {
  id: string;
  url: string;
  blurhash?: string | null | undefined;
}

/**
 * A place's photographs, filling whatever box they are given.
 *
 * Distinct from `PhotoStack`, which is a 240px card deck for a section inside
 * the page. This one is the surface a screen is built on — the hero, and the
 * thing behind the bottom sheet — so it is edge-to-edge, square-cornered, and
 * one photo at a time rather than a fan of three.
 *
 * The gesture and its threshold are `swipeIntent`, imported rather than
 * rewritten: two copies of a tuned constant are two constants that drift, and
 * that one has already been measured against a real thumb.
 */
export function PlaceGallery({
  photos,
  name,
  categorySlug,
  categoryColor,
  className,
  sizes = '100vw',
  priority = false,
}: {
  photos: GalleryPhoto[];
  /** Names the subject; the photographs carry no description of their own. */
  name: string;
  categorySlug: string;
  categoryColor: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const total = photos.length;

  // No photographs is an ordinary state — most contributed places arrive
  // without one — and `PlaceImage` already draws the category as a fallback.
  if (total === 0) {
    return (
      <div className={cn('bg-surface-sunken relative overflow-hidden', className)}>
        <PlaceImage
          url={null}
          name={name}
          categorySlug={categorySlug}
          categoryColor={categoryColor}
          sizes={sizes}
          fallbackSize="lg"
        />
      </div>
    );
  }

  const go = (delta: number) => {
    setDirection(delta);
    setIndex((current) => (current + delta + total) % total);
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const intent = swipeIntent(info.offset.x, info.velocity.x);
    if (intent !== 0) go(intent);
  };

  const photo = photos[index]!;

  return (
    <div className={cn('bg-surface-sunken relative overflow-hidden', className)}>
      {/*
        `mode="popLayout"` so the outgoing photo leaves the layout immediately
        and the incoming one is not pushed below it for a frame — with two
        absolutely-positioned children the difference is a flash of the sunken
        surface between photographs.
      */}
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={photo.id}
          className="absolute inset-0"
          custom={direction}
          // Travels the way the thumb went. A crossfade alone reads as the
          // photo being replaced; a slide reads as moving along a row.
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          // Springs back to centre on release; `swipeIntent` decides whether
          // the release counted as a page turn.
          drag={total > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          {...(total > 1 ? { onDragEnd: handleDragEnd } : {})}
        >
          <Image
            src={photo.url}
            alt={t('photos.position', { current: index + 1, total, name })}
            fill
            sizes={sizes}
            priority={priority && index === 0}
            className="object-cover"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {total > 1 && (
        <>
          {/*
            Dots at the top, not the bottom.

            The bottom of this box is underneath the sheet at every resting
            height, so anything anchored there is a control nobody can see.
            They are real buttons as well as an indicator: a swipe is invisible
            and unavailable to a keyboard, so the affordance that says "there
            are five of these" has to be the one that also works without one.
          */}
          <div className="pt-safe-float pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-1.5">
            {photos.map((option, position) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setDirection(position > index ? 1 : -1);
                  setIndex(position);
                }}
                aria-label={t('photos.position', { current: position + 1, total, name })}
                aria-current={position === index}
                className={cn(
                  'pointer-events-auto h-1.5 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.5)] transition-all',
                  position === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60',
                )}
              />
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            {t('photos.position', { current: index + 1, total, name })}
          </p>
        </>
      )}
    </div>
  );
}
