'use client';

import { Star, ThumbsUp, Store } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Review } from '../api';

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${String(days)} days ago`;
  if (days < 365) return `${String(Math.floor(days / 30))} months ago`;
  return `${String(Math.floor(days / 365))} years ago`;
}

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
  return (
    <article className="rounded-lg bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-sm font-semibold text-primary">
          {review.author.name.trim().charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-sm font-semibold text-ink">{review.author.name}</p>
            {review.isMine && (
              <span className="shrink-0 rounded-full bg-primary-tint px-2 py-0.5 text-[0.625rem] font-semibold text-primary">
                You
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-0.5" aria-label={`${String(review.rating)} out of 5`}>
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
            <span className="text-xs text-ink-subtle">{relativeTime(review.createdAt)}</span>
          </div>
        </div>
      </div>

      {review.content && (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink">
          {review.content}
        </p>
      )}

      {/* The business reply, indented and visually attached to the review it
          answers — a reply floating as a sibling reads as a second review. */}
      {review.reply && (
        <div className="mt-3 rounded-md border-l-2 border-primary/30 bg-surface-sunken p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Store className="size-3.5 text-primary" aria-hidden />
            {review.reply.businessName}
            <span className="font-normal text-ink-subtle">· owner</span>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{review.reply.content}</p>
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
              'transition-colors active:scale-95',
              review.hasVoted
                ? 'bg-primary-tint text-primary'
                : 'bg-surface-sunken text-ink-muted',
            )}
          >
            <ThumbsUp className={cn('size-3.5', review.hasVoted && 'fill-current')} aria-hidden />
            Helpful
            {review.helpfulCount > 0 && <span>· {review.helpfulCount}</span>}
          </button>
        )}

        {review.isMine && review.canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-primary"
          >
            Edit
          </button>
        )}

        {review.isMine && (
          <button type="button" onClick={onDelete} className="text-xs font-medium text-ink-subtle">
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="size-9 animate-pulse rounded-full bg-surface-sunken" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-sunken" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-surface-sunken" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-surface-sunken" />
      </div>
    </div>
  );
}
