'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { MapPin, Trash2 } from 'lucide-react';
import { swipeIntent } from '@/features/places/components/PlaceCardStack';
import { CategoryGlyph } from '@/features/categories/CategoryGlyph';
import { categorySolid, categoryTint } from '@/features/categories/color';
import { Avatar } from '@/components/ui/Avatar';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import type { CheckIn } from '../api';
import { placeHref, userHref } from '@/lib/navigation/links';

/**
 * One post, at full width — the Threads half of this screen.
 *
 * The grid answers "what does this person's year look like". This answers
 * "what was that evening", which needs the caption, the place, the date and
 * every photograph rather than the first one.
 */
export function CheckInCard({
  checkIn,
  showAuthor = false,
  onDelete,
  deleting = false,
}: {
  checkIn: CheckIn;
  /** On a place's gallery every row is somebody different; on a profile it is not. */
  showAuthor?: boolean;
  onDelete?: (checkIn: CheckIn) => void;
  deleting?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const total = checkIn.images.length;
  const photo = checkIn.images[Math.min(index, total - 1)];

  const go = (delta: number) => {
    setDirection(delta);
    setIndex((current) => (current + delta + total) % total);
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const intent = swipeIntent(info.offset.x, info.velocity.x);
    if (intent !== 0) go(intent);
  };

  return (
    <article className="bg-surface overflow-hidden rounded-lg shadow-md">
      {showAuthor && (
        <header className="flex items-center gap-2.5 px-3.5 pt-3.5">
          <Avatar name={checkIn.author.name} url={checkIn.author.avatarUrl} size="xs" />
          <Link
            href={userHref(checkIn.author.id)}
            className="text-ink truncate text-sm font-semibold"
          >
            {checkIn.author.name}
          </Link>
        </header>
      )}

      {/*
        The photograph, edge to edge inside the card.

        4:5 rather than square. A phone camera's portrait frame is 3:4 and its
        landscape is 4:3, so a square crops one of them badly whichever way you
        choose; 4:5 is tall enough to keep a portrait shot intact and short
        enough that a landscape one is not a letterbox in the middle of a list.
      */}
      <div
        className={cn(
          'bg-surface-sunken relative aspect-[4/5] w-full overflow-hidden',
          showAuthor && 'mt-3',
        )}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          {photo && (
            <motion.div
              key={photo.id}
              className="absolute inset-0"
              // Travels the way the thumb went, the same as the place gallery.
              // Two swipeable photo surfaces in one app that move differently
              // is two apps.
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              drag={total > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              {...(total > 1 ? { onDragEnd: handleDragEnd } : {})}
            >
              <Image
                src={photo.url}
                alt={t('checkin.photoAt', { place: checkIn.place.name })}
                fill
                sizes="(max-width: 30rem) 100vw, 480px"
                className="object-cover"
                draggable={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {total > 1 && (
          <>
            {/* Real buttons, not just an indicator: a swipe is invisible and
                unavailable to a keyboard, so the thing that says "there are
                four of these" has to be the thing that also works without one. */}
            <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
              {checkIn.images.map((image, position) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => {
                    setDirection(position > index ? 1 : -1);
                    setIndex(position);
                  }}
                  aria-label={t('photos.position', {
                    current: position + 1,
                    total,
                    name: checkIn.place.name,
                  })}
                  aria-current={position === index}
                  className={cn(
                    'h-1.5 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.5)] transition-all',
                    position === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60',
                  )}
                />
              ))}
            </div>

            <p className="sr-only" aria-live="polite">
              {t('photos.position', { current: index + 1, total, name: checkIn.place.name })}
            </p>
          </>
        )}
      </div>

      <div className="px-3.5 pt-3 pb-3.5">
        {/*
          The place, as a link and in its own colour.

          The one thing that separates this from a photo app: every post is of
          somewhere you can go, and the row is the way there. The category tint
          is the same treatment the rest of the app gives a category, so the
          shape and the colour are already known by the time somebody gets here.
        */}
        <Link
          href={placeHref(checkIn.place.slug)}
          className="press-surface inline-flex max-w-full items-center gap-2 rounded-full py-1 pr-3 pl-1"
          style={{ backgroundColor: categoryTint(checkIn.place.categoryColor) }}
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: categorySolid(checkIn.place.categoryColor) }}
          >
            <CategoryGlyph
              iconKey={checkIn.place.categoryIcon}
              className="size-3.5"
              strokeWidth={2}
            />
          </span>
          <span className="text-ink truncate text-sm font-semibold">{checkIn.place.name}</span>
        </Link>

        {checkIn.caption && (
          <p className="text-ink mt-2.5 text-sm leading-relaxed">{checkIn.caption}</p>
        )}

        <div className="text-ink-subtle mt-2 flex items-center gap-2 text-xs">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {checkIn.place.district ? `${checkIn.place.district}, ` : ''}
            {checkIn.place.province}
          </span>
          <span aria-hidden>·</span>
          {/* The day it happened, not the day it was posted. */}
          <time dateTime={checkIn.visitedAt}>{formatDate(checkIn.visitedAt, locale)}</time>

          {checkIn.canDelete && onDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                onDelete(checkIn);
              }}
              aria-label={t('checkin.delete')}
              className="text-ink-subtle hover:text-danger ml-auto shrink-0 disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
