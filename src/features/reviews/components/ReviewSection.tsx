'use client';

import { useState } from 'react';
import { MessageSquarePlus, Star } from 'lucide-react';
import { ReviewCard, ReviewCardSkeleton } from './ReviewCard';
import { WriteReviewSheet } from './WriteReviewSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import {
  useDeleteReview,
  useReviewSummary,
  useReviews,
  useToggleHelpful,
} from '../hooks/useReviews';
import type { Review, ReviewSort } from '../api';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatNumber, formatRating } from '@/i18n/format';
import { useCodeMessage } from '@/i18n/useErrorMessage';
import type { MessageKey } from '@/i18n/messages/keys';
import { cn } from '@/lib/utils/cn';

const SORTS: Array<{ value: ReviewSort; labelKey: MessageKey }> = [
  { value: 'helpful', labelKey: 'reviews.sortHelpful' },
  { value: 'recent', labelKey: 'reviews.sortRecent' },
  { value: 'rating_high', labelKey: 'reviews.sortHigh' },
  { value: 'rating_low', labelKey: 'reviews.sortLow' },
];

/**
 * Reviews on the place detail screen (§22).
 *
 * The write affordance is driven entirely by the server's `canReview` and
 * `cannotReviewReason`. The rules — one per person, never your own business,
 * only approved places — are server policy, so the client is told rather than
 * left to infer them and eventually render a button the API refuses.
 */
export function ReviewSection({ placeId, placeName }: { placeId: string; placeName: string }) {
  const t = useT();
  const locale = useLocale();
  const refusalMessage = useCodeMessage();
  const [sort, setSort] = useState<ReviewSort>('helpful');
  const [writing, setWriting] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);

  const { data: summary } = useReviewSummary(placeId);
  const { data: page, isPending } = useReviews(placeId, sort);
  const toggleHelpful = useToggleHelpful(placeId, sort);
  const removeReview = useDeleteReview(placeId);

  const reviews = page?.data ?? [];
  const total = summary?.reviewCount ?? 0;

  return (
    <section className="border-border mt-5 border-t pt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-ink text-sm font-semibold">
          {t('reviews.title')}{' '}
          {total > 0 && <span className="text-ink-subtle">({formatNumber(total, locale)})</span>}
        </h2>
      </div>

      {summary && total > 0 && (
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-ink text-3xl leading-none font-semibold">
              {formatRating(summary.averageRating, locale)}
            </p>
            <span className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'size-3',
                    star <= Math.round(summary.averageRating)
                      ? 'fill-warning text-warning'
                      : 'text-border',
                  )}
                  aria-hidden
                />
              ))}
            </span>
          </div>

          {/* Histogram: an average alone hides whether a 4.0 is everyone
              agreeing or a fight between fives and ones. */}
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.breakdown[String(star)] ?? 0;
              const percent = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-ink-subtle w-2 text-right text-3xs">
                    {formatNumber(star, locale)}
                  </span>
                  <span className="bg-surface-sunken h-1.5 flex-1 overflow-hidden rounded-full">
                    <span
                      className="bg-warning block h-full rounded-full"
                      style={{ width: `${String(percent)}%` }}
                    />
                  </span>
                  <span className="text-ink-subtle w-6 text-3xs">
                    {formatNumber(count, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        {summary?.canReview && (
          <Button
            variant="secondary"
            fullWidth
            leadingIcon={<MessageSquarePlus className="size-4" aria-hidden />}
            onClick={() => {
              setEditing(null);
              setWriting(true);
            }}
          >
            {t('reviews.write')}
          </Button>
        )}

        {/* The reason is shown, not hidden. "Sign in to write a review" is
            actionable; a missing button is just confusing. */}
        {summary && !summary.canReview && summary.cannotReviewReason && (
          <p className="bg-surface-sunken text-ink-muted rounded-md p-3 text-center text-sm">
            {/* By code where there is one, by the server's prose otherwise.
                Until the API grew `cannotReviewCode`, this line was the one
                place a Vietnamese screen showed an English sentence with no
                way to translate it. */}
            {refusalMessage(summary.cannotReviewCode) ?? summary.cannotReviewReason}
          </p>
        )}
      </div>

      {total > 1 && (
        <div className="mt-4 flex scrollbar-none gap-2 overflow-x-auto pb-1">
          {SORTS.map((option) => (
            <Chip
              key={option.value}
              selected={sort === option.value}
              onClick={() => {
                setSort(option.value);
              }}
            >
              {t(option.labelKey)}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {isPending && (
          <>
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
          </>
        )}

        {!isPending && reviews.length === 0 && (
          <p className="bg-surface text-ink-muted rounded-lg p-5 text-center text-sm shadow-sm">
            {t('reviews.none')}
          </p>
        )}

        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onToggleHelpful={(helpful) => {
              toggleHelpful.mutate({ reviewId: review.id, helpful });
            }}
            onEdit={() => {
              setEditing(review);
              setWriting(true);
            }}
            onDelete={() => {
              removeReview.mutate(review.id);
            }}
          />
        ))}

        {page?.meta?.hasMore && (
          <p className="text-ink-subtle pt-1 text-center text-xs">
            {t('reviews.showingFirst', { count: reviews.length })}
          </p>
        )}
      </div>

      <WriteReviewSheet
        open={writing}
        onOpenChange={setWriting}
        placeId={placeId}
        placeName={placeName}
        existing={editing}
      />
    </section>
  );
}
