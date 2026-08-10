'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Search } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Card, PageHeader, QueueEmpty, RowSkeleton, StatusBadge, TimeAgo } from './primitives';
import { ReasonDialog } from './ReasonDialog';
import {
  deleteReview,
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
    mutationFn: ({ placeId, reason }: { placeId: string; reason: string }) =>
      suspendPlace(placeId, reason),
    onSuccess: async () => {
      setSuspendTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const removeReview = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return (
    <>
      <PageHeader title="Content" description="Everything already published." />

      <div className="mb-5 flex flex-wrap gap-2">
        <Chip
          selected={tab === 'places'}
          onClick={() => {
            setTab('places');
          }}
        >
          Places
        </Chip>
        <Chip
          selected={tab === 'reviews'}
          onClick={() => {
            setTab('reviews');
          }}
        >
          Reviews
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
                placeholder="Place name"
                aria-label="Search places"
                className="bg-surface text-ink placeholder:text-ink-subtle focus-visible:outline-primary h-11 w-full rounded-md pr-4 pl-10 text-sm shadow-sm outline-none focus-visible:outline-2"
              />
            </label>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>

          <div className="mb-5 flex flex-wrap gap-2">
            <Chip
              selected={status === undefined}
              onClick={() => {
                setStatus(undefined);
              }}
            >
              Any status
            </Chip>
            {PLACE_STATUSES.map((value) => (
              <Chip
                key={value}
                selected={status === value}
                onClick={() => {
                  setStatus(value);
                }}
              >
                {value.toLowerCase()}
              </Chip>
            ))}
          </div>

          {places.isPending && <RowSkeleton />}
          {places.data?.length === 0 && <QueueEmpty label="No places match." />}

          <div className="space-y-2.5">
            {places.data?.map((place) => (
              <Card key={place.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-ink truncate font-semibold">{place.name}</h3>
                      <StatusBadge status={place.deletedAt ? 'DELETED' : place.status} />
                    </div>
                    <p className="text-ink-muted mt-0.5 truncate text-sm">
                      {place.address ?? 'No address'}
                    </p>
                    <p className="text-ink-subtle mt-1 text-xs tabular-nums">
                      {place.category.name} · {place.viewCount.toLocaleString()} views ·{' '}
                      {place.reviewCount} reviews
                      {place.reviewCount > 0 && ` · ${place.averageRating.toFixed(1)}★`}
                      {place.ownerProfile && ` · claimed by ${place.ownerProfile.businessName}`}
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
                      Open
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
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
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
                {value === undefined ? 'All ratings' : `${String(value)}★ and below`}
              </Chip>
            ))}
          </div>

          {reviews.isPending && <RowSkeleton />}
          {reviews.data?.length === 0 && <QueueEmpty label="No reviews in this band." />}

          <div className="space-y-2.5">
            {reviews.data?.map((review) => (
              <Card key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold">
                      {review.rating}★ · {review.user.name}
                      <span className="text-ink-subtle font-normal"> on </span>
                      <Link
                        href={`/place/${review.place.slug}`}
                        target="_blank"
                        className="hover:text-primary"
                      >
                        {review.place.name}
                      </Link>
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-xs">
                      <TimeAgo iso={review.createdAt} /> · {review.helpfulCount} found this helpful
                    </p>
                    {review.content && (
                      <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                        {review.content}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={review.status} />
                    {review.status !== 'DELETED' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setDeleteTarget(review);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ReasonDialog
        open={suspendTarget !== null}
        title={`Suspend “${suspendTarget?.name ?? ''}”`}
        description="It disappears from search and the map. Its reviews and history are kept, and approving it again restores it with its original publish date."
        confirmLabel="Suspend"
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
        open={deleteTarget !== null}
        title="Delete this review"
        description="The place's rating is recalculated without it. The review is soft-deleted, so it can still be produced if the decision is disputed."
        confirmLabel="Delete the review"
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
