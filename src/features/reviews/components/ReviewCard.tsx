'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { Flag, Star, ThumbsUp, Store } from 'lucide-react';
import { ReportSheet } from '@/features/reports/ReportSheet';
import { useIsAuthenticated } from '@/features/auth/store';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber, formatRelativeTime } from '@/i18n/format';
import { useNow } from '@/lib/utils/useNow';
import { cn } from '@/lib/utils/cn';
import type { Review } from '../api';
import { Avatar } from '@/components/ui/Avatar';
import { userHref } from '@/lib/navigation/links';

export function ReviewCard({
  review,
  onToggleHelpful,
  onEdit,
  onDelete,
}: {
  review: Review;
  onToggleHelpful?: (helpful: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const now = useNow();
  const isAuthenticated = useIsAuthenticated();
  const [reporting, setReporting] = useState(false);

  return (
    <article className="bg-surface rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* The DTO has carried `author.avatarUrl` since reviews existed; it
            was the one field nothing drew. */}
        <Avatar name={review.author.name} url={review.author.avatarUrl} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {/* The name is the way in to a profile. It was plain text until
                profiles existed, which meant a review told you who wrote it
                and gave you no way to see anything else they had written. */}
            <Link
              href={userHref(review.author.id)}
              className="text-ink hover:text-primary truncate text-sm font-semibold"
            >
              {review.author.name}
            </Link>
            {review.isMine && (
              <span className="bg-primary-tint text-primary text-3xs shrink-0 rounded-full px-2 py-0.5 font-semibold">
                {t('reviews.you')}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className="flex items-center gap-0.5"
              aria-label={t('reviews.ratingOutOf', { rating: review.rating })}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'size-3.5',
                    star <= review.rating ? 'fill-warning text-warning' : 'text-border',
                  )}
                  aria-hidden
                />
              ))}
            </span>
            {/* `useNow` ticks, so "2 minutes ago" does not sit frozen while
                somebody reads the page — and it starts at 0 on the server so
                the markup matches on hydration. */}
            <span className="text-ink-subtle text-xs">
              {now === 0
                ? review.createdAt.slice(0, 10)
                : formatRelativeTime(new Date(review.createdAt), now, locale)}
            </span>
          </div>
        </div>
      </div>

      {review.content && (
        <p className="text-ink mt-3 text-sm leading-relaxed whitespace-pre-line">
          {review.content}
        </p>
      )}

      {/*
        A row, not a deck.

        The deck on the detail page is one object the reader is looking *at*;
        these belong to a card in a list they are scrolling *past*, and four
        stacked layers per review would turn the list into a pile. Sized so
        four fit across a phone without a second row.
      */}
      {review.images.length > 0 && (
        <ul className="mt-3 flex gap-2">
          {review.images.map((image, index) => (
            <li
              key={image.id}
              className="bg-surface-sunken relative size-20 overflow-hidden rounded-md"
            >
              <Image
                src={image.url}
                alt={t('reviews.photoAlt', {
                  position: index + 1,
                  name: review.author.name,
                })}
                fill
                sizes="80px"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {/* The business reply, indented and visually attached to the review it
          answers — a reply floating as a sibling reads as a second review. */}
      {review.reply && (
        <div className="border-primary/30 bg-surface-sunken mt-3 rounded-md border-l-2 p-3">
          <p className="text-ink flex items-center gap-1.5 text-xs font-semibold">
            <Store className="text-primary size-3.5" aria-hidden />
            {review.reply.businessName}
            <span className="text-ink-subtle font-normal">· {t('reviews.owner')}</span>
          </p>
          <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{review.reply.content}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        {!review.isMine && (
          <button
            type="button"
            onClick={() => {
              onToggleHelpful?.(!review.hasVoted);
            }}
            aria-pressed={review.hasVoted}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium',
              'press-firm',
              review.hasVoted ? 'bg-primary-tint text-primary' : 'bg-surface-sunken text-ink-muted',
            )}
          >
            <ThumbsUp className={cn('size-3.5', review.hasVoted && 'fill-current')} aria-hidden />
            {t('reviews.helpful')}
            {review.helpfulCount > 0 && <span>· {formatNumber(review.helpfulCount, locale)}</span>}
          </button>
        )}

        {review.isMine && review.canEdit && (
          <button type="button" onClick={onEdit} className="text-primary text-xs font-medium">
            {t('common.edit')}
          </button>
        )}

        {review.isMine && (
          <button type="button" onClick={onDelete} className="text-ink-subtle text-xs font-medium">
            {t('common.delete')}
          </button>
        )}

        {/* Quiet, and last. `ReportTargetType.REVIEW` and the moderator queue
            that resolves it have both existed since Phase 11; nothing in the
            app could ever file one. Hidden from the author, who has Delete. */}
        {!review.isMine && isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              setReporting(true);
            }}
            aria-label={t('report.reviewAction')}
            className="text-ink-subtle hover:text-ink-muted ml-auto inline-flex items-center"
          >
            <Flag className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      <ReportSheet
        target={{ type: 'REVIEW', id: review.id, label: review.author.name }}
        open={reporting}
        onOpenChange={setReporting}
      />
    </article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-surface-sunken size-9 animate-pulse rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="bg-surface-sunken h-3.5 w-1/3 animate-pulse rounded" />
          <div className="bg-surface-sunken h-3 w-1/4 animate-pulse rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="bg-surface-sunken h-3 w-full animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-4/5 animate-pulse rounded" />
      </div>
    </div>
  );
}
