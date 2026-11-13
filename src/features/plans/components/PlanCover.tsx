'use client';

import type { ReactNode } from 'react';
import { Route } from 'lucide-react';
import { PlaceImage } from '@/features/places/components/PlaceImage';
import type { CategoryIconKey } from '@/features/categories/api';
import { cn } from '@/lib/utils/cn';

export interface PlanCoverImage {
  title: string;
  coverImageUrl: string | null;
  coverBlurhash: string | null;
  coverCategoryIcon: CategoryIconKey | null;
  coverCategoryColor: string | null;
}

/**
 * The top of a day: its first stop's photograph, with the day's name on it.
 *
 * A plan used to open on a line of 28px text over the page background, the
 * same as a settings screen. But a day out is the one thing in this app that
 * is *about* somewhere, and it already owns a picture of that somewhere — so
 * the picture leads and the title sits on it, the way it does on a ticket or
 * the cover of a guidebook.
 *
 * One component for the owner's editor and the public page, so a link opens
 * on the same cover its sender was looking at when they sent it.
 */
export function PlanCover({
  plan,
  top,
  children,
  className,
}: {
  plan: PlanCoverImage;
  /** The row along the top edge: a way back, a share button. */
  top?: ReactNode;
  /** The title and whatever sits under it. Rendered in white, on the scrim. */
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    // `isolate` so the scrim and the photograph stack against each other and
    // nothing outside — without it the sheet's own layers can slide between.
    <div className={cn('bg-ink relative isolate overflow-hidden', className)}>
      {plan.coverImageUrl ? (
        <PlaceImage
          url={plan.coverImageUrl}
          blurhash={plan.coverBlurhash}
          name={plan.title}
          categoryIconKey={plan.coverCategoryIcon ?? 'dot'}
          categoryColor={plan.coverCategoryColor ?? '#18181b'}
          sizes="(max-width: 480px) 100vw, 480px"
          priority
        />
      ) : (
        /*
         * A day with nothing in it yet has no photograph to borrow.
         *
         * The place fallback is a pale wash, and white type on a pale wash is
         * unreadable — so an empty day keeps the dark ground and gets a route
         * drawn across it instead: the shape of the thing it is about to be.
         */
        <Route
          className="absolute -right-8 -bottom-10 size-56 text-white/[0.07]"
          strokeWidth={1.25}
          aria-hidden
        />
      )}

      {/*
        Dark at both ends, lighter between.
        The bottom carries the title and has to hold white text over any
        photograph, including a sky; the top carries two buttons and needs
        enough to keep their edges visible over a white building.
      */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40"
        aria-hidden
      />

      <div className="relative flex min-h-56 flex-col justify-between gap-6 p-4 text-white">
        <div className="flex min-h-11 items-start justify-between gap-2">{top}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

/** A pill that sits on the cover: translucent, so the photograph stays the subject. */
export const coverChipClass =
  'inline-flex h-8 items-center gap-1.5 rounded-full bg-white/18 px-3 text-xs font-semibold text-white backdrop-blur-md';

/** A round control on the cover. 44px, like every other icon button. */
export const coverButtonClass =
  'press-firm flex size-11 shrink-0 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md disabled:opacity-40';
