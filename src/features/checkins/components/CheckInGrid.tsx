'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Images, MapPin } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import type { CheckIn } from '../api';

/**
 * The grid: one square per post, first photograph only.
 *
 * The other half of this screen is a feed that shows everything — caption,
 * place, every picture. This one deliberately shows almost nothing, because
 * that is what a grid is *for*: it answers "what does the last year look like"
 * in one screen, which no list of cards can do at any length.
 *
 * Edge to edge with hairline gaps rather than rounded tiles in a padded
 * column. Rounded corners at this size turn a wall of photographs into a bag
 * of stamps — the photographs stop meeting each other, and the wall was the
 * point.
 */
export function CheckInGrid({
  checkIns,
  onOpen,
}: {
  checkIns: CheckIn[];
  onOpen: (checkIn: CheckIn) => void;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();

  return (
    <ul className="grid grid-cols-3 gap-px">
      {checkIns.map((checkIn, index) => {
        const cover = checkIn.images[0];
        if (!cover) return null;

        return (
          <motion.li
            key={checkIn.id}
            /*
             * Staggered, and only for the first screenful.
             *
             * `index * 0.02` capped at twelve tiles: past that the delay is
             * longer than the scroll takes to reach them, so a tile would
             * still be fading in under a thumb that has already moved on. The
             * stagger is there to make the first paint feel assembled rather
             * than dumped, not to animate four hundred photographs.
             */
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.28,
              delay: reduceMotion ? 0 : Math.min(index, 11) * 0.02,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <button
              type="button"
              onClick={() => {
                onOpen(checkIn);
              }}
              aria-label={t('checkin.openAt', { place: checkIn.place.name })}
              className="press-firm bg-surface-sunken relative block aspect-square w-full overflow-hidden"
            >
              <Image
                src={cover.url}
                alt=""
                fill
                // A third of the column, and the column is capped at 30rem.
                sizes="(max-width: 30rem) 33vw, 160px"
                className="object-cover"
              />

              {/* Two photographs and twelve look the same in a grid, so the
                  count is the only way to know there is more behind this one. */}
              {checkIn.images.length > 1 && (
                <span className="bg-ink/55 text-3xs absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold text-white backdrop-blur-[2px]">
                  <Images className="size-3" aria-hidden />
                  {checkIn.images.length}
                </span>
              )}

              {/*
                The place, on the tile.

                A grid of anonymous squares is a mood board. The whole claim of
                this app is that a photograph is *of somewhere*, so the name
                rides on it — over a gradient, because the bottom of a
                photograph is whatever the photograph happens to be.
              */}
              <span className="from-ink/70 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent px-1.5 pt-5 pb-1.5">
                <span className="text-3xs flex items-center gap-0.5 font-medium text-white">
                  <MapPin className="size-2.5 shrink-0" aria-hidden />
                  <span className={cn('truncate')}>{checkIn.place.name}</span>
                </span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** Mirrors the grid's shape so nothing shifts when the photographs arrive. */
export function CheckInGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-px">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="bg-surface-sunken aspect-square w-full animate-pulse" />
      ))}
    </div>
  );
}
