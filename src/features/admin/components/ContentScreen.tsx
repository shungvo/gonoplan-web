'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Search } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { useEnumLabel } from '@/i18n/useEnumLabel';
import { formatNumber, formatRating } from '@/i18n/format';
import {
  Card,
  CardGrid,
  PageHeader,
  QueueEmpty,
  RowSkeleton,
  StatusBadge,
  TimeAgo,
} from './primitives';
import { ReasonDialog } from './ReasonDialog';
import {
  deleteReview,
  hideReview,
  removeReviewReply,
  restoreReview,
  fetchPlaces,
  fetchReviews,
  suspendPlace,
  type AdminPlace,
  type AdminReview,
} from '../api';

type Tab = 'places' | 'reviews';

const PLACE_STATUSES = ['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'] as const;

/**
 * The catalogue, as distinct from the review queue.
 *
 * This is the screen a moderator opens when someone emails about a listing
 * that is already live — the queue only ever shows what has not been decided.
 */
export function ContentScreen() {
  const t = useT();
  const locale = useLocale();
  const enumLabel = useEnumLabel();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('places');
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [maxRating, setMaxRating] = useState<number | undefined>(3);
  const [suspendTarget, setSuspendTarget] = useState<AdminPlace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);

  const places = useQuery({
    queryKey: ['admin', 'catalogue', 'places', submitted, status],
    queryFn: () => fetchPlaces({ query: submitted || undefined, status }),
    enabled: tab === 'places',
  });

  const reviews = useQuery({
    queryKey: ['admin', 'catalogue', 'reviews', maxRating],
    queryFn: () => fetchReviews({ maxRating }),
    enabled: tab === 'reviews',
  });

  const suspend = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: ({ placeId, reason }: { placeId: string; reason: string }) =>
      suspendPlace(placeId, reason),
    onSuccess: async () => {
      setSuspendTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);

  const removeReply = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      removeReviewReply(reviewId, reason),
    onSuccess: async () => {
      setReplyTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'catalogue', 'reviews'] });
    },
  });

  const setVisibility = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      hidden ? hideReview(id, 'Hidden by a moderator from the review queue') : restoreReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalogue', 'reviews'] }),
  });

  const removeReview = useMutation({
    // Shown in the dialog that raised it, which is covering the screen.
    meta: { inlineError: true },
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return (
    <>
      <PageHeader title={t('admin.content')} description={t('content.description')} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Chip
          selected={tab === 'places'}
          onClick={() => {
            setTab('places');
          }}
        >
          {t('content.places')}
        </Chip>
        <Chip
          selected={tab === 'reviews'}
          onClick={() => {
            setTab('reviews');
          }}
        >
          {t('content.reviews')}
        </Chip>
      </div>

      {tab === 'places' && (
        <>
          <form
            className="mb-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(term.trim());
            }}
          >
            <label className="relative min-w-56 flex-1">
              <Search
                className="text-ink-subtle pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                }}
                type="search"
                placeholder={t('content.placeNamePlaceholder')}
                aria-label={t('content.searchPlaces')}
                className="bg-surface text-ink placeholder:text-ink-subtle focus-visible:outline-primary h-11 w-full rounded-md pr-4 pl-10 text-sm shadow-sm outline-none focus-visible:outline-2"
              />
            </label>
            <Button type="submit" size="sm">
              {t('admin.search')}
            </Button>
          </form>

          <div className="mb-5 flex flex-wrap gap-2">
            <Chip
              selected={status === undefined}
              onClick={() => {
                setStatus(undefined);
              }}
            >
              {t('content.anyStatus')}
            </Chip>
            {PLACE_STATUSES.map((value) => (
              <Chip
                key={value}
                selected={status === value}
                onClick={() => {
                  setStatus(value);
                }}
              >
                {enumLabel('status', value)}
              </Chip>
            ))}
          </div>

          {places.isPending && <RowSkeleton />}
          {places.data?.length === 0 && <QueueEmpty label={t('content.noPlaces')} />}

          <CardGrid>
            {places.data?.map((place) => (
              <Card key={place.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-ink truncate font-semibold">{place.name}</h3>
                      <StatusBadge status={place.deletedAt ? 'DELETED' : place.status} />
                    </div>
                    <p className="text-ink-muted mt-0.5 truncate text-sm">
                      {place.address ?? t('content.noAddress')}
                    </p>
                    <p className="text-ink-subtle mt-1 text-xs tabular-nums">
                      {place.category.name} ·{' '}
                      {t('content.placeMeta', {
                        views: place.viewCount,
                        reviews: place.reviewCount,
                      })}
                      {place.reviewCount > 0 &&
                        ` · ${formatRating(place.averageRating, locale)}★`}
                      {place.ownerProfile &&
                        ` · ${t('content.claimedBy', {
                          name: place.ownerProfile.businessName,
                        })}`}
                    </p>
                    {place.rejectionReason && (
                      <p className="bg-danger/5 text-danger mt-2 rounded-md p-2 text-xs">
                        {place.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/place/${place.slug}`}
                      target="_blank"
                      className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                    >
                      {t('admin.open')}
                      <ExternalLink className="size-3" aria-hidden />
                    </Link>
                    {place.status === 'APPROVED' && !place.deletedAt && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSuspendTarget(place);
                        }}
                      >
                        {t('content.suspend')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardGrid>
        </>
      )}

      {tab === 'reviews' && (
        <>
          {/* Defaults to 3 and below. Moderation reaches for low ratings first
              — that is where retaliation and abuse live. */}
          <div className="mb-5 flex flex-wrap gap-2">
            {[2, 3, undefined].map((value) => (
              <Chip
                key={value ?? 'all'}
                selected={maxRating === value}
                onClick={() => {
                  setMaxRating(value);
                }}
              >
                {value === undefined
                  ? t('content.allRatings')
                  : t('content.ratingAndBelow', { rating: value })}
              </Chip>
            ))}
          </div>

          {reviews.isPending && <RowSkeleton />}
          {reviews.data?.length === 0 && <QueueEmpty label={t('content.noReviews')} />}

          <CardGrid>
            {reviews.data?.map((review) => (
              <Card key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold">
                      {formatNumber(review.rating, locale)}★ · {review.user.name}
                      <span className="text-ink-subtle font-normal"> {t('content.reviewOn')} </span>
                      <Link
                        href={`/place/${review.place.slug}`}
                        target="_blank"
                        className="hover:text-primary"
                      >
                        {review.place.name}
                      </Link>
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs">
                      <TimeAgo iso={review.createdAt} /> ·{' '}
                      {t('content.foundHelpful', { count: review.helpfulCount })}
                    </p>
                    {review.content && (
                      <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                        {review.content}
                      </p>
                    )}

                    {/* The owner's reply. The queue could not show this at
                        all before, so an abusive one was both invisible here
                        and removable only by the business that wrote it. */}
                    {review.reply && (
                      <div className="border-border bg-surface-sunken mt-3 rounded-md border-l-2 p-3">
                        <p className="text-ink flex items-center gap-1.5 text-xs font-semibold">
                          {t('content.replyFrom', { name: review.reply.businessName })}
                        </p>
                        <p className="text-ink-muted mt-1 text-sm leading-relaxed">
                          {review.reply.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTarget(review);
                          }}
                          className="text-danger mt-2 text-xs font-medium"
                        >
                          {t('content.removeReply')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={review.status} />
                    {/* Hide before delete, and it is the wider button:
                        reversible moderation should be the easier reach. */}
                    {review.status !== 'DELETED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={setVisibility.isPending}
                        onClick={() => {
                          setVisibility.mutate({
                            id: review.id,
                            hidden: review.status !== 'HIDDEN',
                          });
                        }}
                      >
                        {review.status === 'HIDDEN' ? t('content.restore') : t('content.hide')}
                      </Button>
                    )}
                    {review.status !== 'DELETED' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setDeleteTarget(review);
                        }}
                      >
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardGrid>
        </>
      )}

      <ReasonDialog
        open={suspendTarget !== null}
        title={t('content.suspendTitle', { name: suspendTarget?.name ?? '' })}
        description={t('content.suspendBody')}
        confirmLabel={t('content.suspend')}
        destructive
        isPending={suspend.isPending}
        error={suspend.error}
        onConfirm={(reason) => {
          if (suspendTarget) suspend.mutate({ placeId: suspendTarget.id, reason });
        }}
        onClose={() => {
          setSuspendTarget(null);
          suspend.reset();
        }}
      />

      {/* No reason field: the server's review deletion takes none, and a box
          whose contents are silently discarded is worse than no box. */}
      <ReasonDialog
        open={replyTarget !== null}
        title={t('content.removeReplyTitle')}
        description={t('content.removeReplyBody')}
        confirmLabel={t('content.removeReply')}
        destructive
        isPending={removeReply.isPending}
        error={removeReply.error}
        onConfirm={(reason) => {
          if (replyTarget) removeReply.mutate({ reviewId: replyTarget.id, reason });
        }}
        onClose={() => {
          setReplyTarget(null);
          removeReply.reset();
        }}
      />

      <ReasonDialog
        open={deleteTarget !== null}
        title={t('content.deleteReviewTitle')}
        description={t('content.deleteReviewBody')}
        confirmLabel={t('content.deleteReviewConfirm')}
        requireReason={false}
        destructive
        isPending={removeReview.isPending}
        error={removeReview.error}
        onConfirm={() => {
          if (deleteTarget) removeReview.mutate(deleteTarget.id);
        }}
        onClose={() => {
          setDeleteTarget(null);
          removeReview.reset();
        }}
      />
    </>
  );
}
