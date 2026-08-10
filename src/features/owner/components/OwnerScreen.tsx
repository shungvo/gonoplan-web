'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  MessageSquare,
  Store,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/errors';
import { useSessionStore } from '@/features/auth/store';
import { AuthSheet } from '@/features/auth/components/AuthSheet';
import { Sparkline } from './Sparkline';
import { RegisterBusinessForm } from './RegisterBusinessForm';
import { ReplySheet } from './ReplySheet';
import {
  fetchDashboard,
  fetchOwnerPlaces,
  fetchOwnerReviews,
  fetchPlaceAnalytics,
  type OwnerReview,
} from '../api';
import { cn } from '@/lib/utils/cn';

type Tab = 'places' | 'reviews';

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/15 text-warning',
  REJECTED: 'bg-danger/10 text-danger',
  SUSPENDED: 'bg-danger/10 text-danger',
};

/**
 * Owner dashboard (§24).
 *
 * Deliberately reachable before approval. A pending or rejected owner locked
 * out of this screen has no way to learn their status or to fix and resubmit —
 * the server returns `canManagePlaces` and the reason for exactly this reason.
 */
export function OwnerScreen() {
  const router = useRouter();
  const { user, isInitializing } = useSessionStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('places');
  const [replyTo, setReplyTo] = useState<OwnerReview | null>(null);
  const [unansweredOnly, setUnansweredOnly] = useState(true);
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const dashboard = useQuery({
    queryKey: ['owner', 'dashboard'],
    queryFn: fetchDashboard,
    enabled: user !== null,
    // A missing business profile is a 404 by design, not a transient failure.
    retry: false,
  });

  const places = useQuery({
    queryKey: ['owner', 'places'],
    queryFn: fetchOwnerPlaces,
    enabled: user !== null && dashboard.isSuccess,
  });

  const reviews = useQuery({
    queryKey: ['owner', 'reviews', unansweredOnly],
    queryFn: () => fetchOwnerReviews(unansweredOnly),
    enabled: user !== null && dashboard.isSuccess && tab === 'reviews',
  });

  const analytics = useQuery({
    queryKey: ['owner', 'analytics', expandedPlaceId],
    queryFn: () => fetchPlaceAnalytics(expandedPlaceId!, 30),
    enabled: expandedPlaceId !== null,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner'] });
    },
  });

  const noProfile =
    dashboard.error instanceof ApiError && dashboard.error.status === 404;

  return (
    <div className="px-safe">
      <header className="pt-safe px-5">
        <button
          type="button"
          onClick={() => {
            router.push('/profile');
          }}
          aria-label="Back"
          className="text-ink-muted -ml-2 mt-3 flex size-9 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>

        <h1 className="text-ink mt-1 text-[1.75rem] leading-tight font-semibold tracking-tight">
          Your business
        </h1>
      </header>

      <div className="mt-4 px-5">
        {(isInitializing || (user !== null && dashboard.isPending)) && (
          <div className="bg-surface h-28 animate-pulse rounded-lg shadow-sm" />
        )}

        {!isInitializing && !user && (
          <EmptyState
            icon={<Store className="size-7" aria-hidden />}
            title="Sign in to manage a business"
            description="Claim your place, respond to reviews, and see how many people are finding you."
            action={
              <Button
                onClick={() => {
                  setAuthOpen(true);
                }}
              >
                Sign in
              </Button>
            }
          />
        )}

        {user && noProfile && (
          <RegisterBusinessForm
            onRegistered={() => {
              refresh.mutate();
            }}
          />
        )}

        {user && dashboard.data && (
          <>
            <section className="bg-surface rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink truncate font-semibold">
                    {dashboard.data.profile.businessName}
                  </p>
                  <p className="text-ink-muted mt-0.5 text-sm">
                    {dashboard.data.totals.published} published ·{' '}
                    {dashboard.data.totals.pending} awaiting review
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
                    STATUS_STYLE[dashboard.data.profile.status] ?? 'bg-surface-sunken text-ink',
                  )}
                >
                  {dashboard.data.profile.status.toLowerCase()}
                </span>
              </div>

              {/* The status message is shown, not implied by a missing button.
                  A pending owner needs to know they are in a queue, and a
                  rejected one needs the reason. */}
              {!dashboard.data.profile.canManagePlaces && (
                <p className="bg-surface-sunken text-ink-muted mt-3 flex items-start gap-2 rounded-md p-3 text-sm">
                  <AlertCircle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    {dashboard.data.profile.rejectionReason ??
                      'Your business is awaiting approval. You can still see everything here meanwhile.'}
                  </span>
                </p>
              )}

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Views', value: dashboard.data.totals.views },
                  { label: 'Saves', value: dashboard.data.totals.saves },
                  { label: 'Reviews', value: dashboard.data.totals.reviews },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface-sunken rounded-md py-2.5">
                    <dd className="text-ink text-lg leading-none font-semibold tabular-nums">
                      {stat.value}
                    </dd>
                    <dt className="text-ink-subtle mt-1 text-xs">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            </section>

            <div className="mt-4 flex gap-2">
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
                <MessageSquare className="size-3.5" aria-hidden />
                Reviews
                {dashboard.data.totals.unanswered > 0 && (
                  // Sizes to its content with a floor, and caps at 99+. A fixed
                  // circle clipped "540" to "540" with the edges cut off, which
                  // is worse than no number.
                  <span className="bg-danger ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold text-white tabular-nums">
                    {dashboard.data.totals.unanswered > 99
                      ? '99+'
                      : dashboard.data.totals.unanswered}
                  </span>
                )}
              </Chip>
            </div>

            {tab === 'places' && (
              <div className="mt-3 space-y-2.5">
                {places.data?.length === 0 && (
                  <EmptyState
                    icon={<Store className="size-7" aria-hidden />}
                    title="No places yet"
                    description="Places you submit and claim will appear here with their review status."
                  />
                )}

                {places.data?.map((place) => (
                  <article key={place.id} className="bg-surface rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-ink truncate font-semibold">{place.name}</p>
                        <p className="text-ink-muted mt-0.5 text-xs">{place.category.name}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold',
                          STATUS_STYLE[place.status] ?? 'bg-surface-sunken text-ink',
                        )}
                      >
                        {place.status.toLowerCase()}
                      </span>
                    </div>

                    {place.rejectionReason && (
                      <p className="bg-danger/5 text-danger mt-2.5 rounded-md p-2.5 text-xs">
                        {place.rejectionReason}
                      </p>
                    )}

                    {place.hasPendingRevision && (
                      <p className="text-ink-muted mt-2.5 flex items-center gap-1.5 text-xs">
                        <Clock className="size-3.5" aria-hidden />
                        Your changes are awaiting review
                      </p>
                    )}

                    <div className="text-ink-subtle mt-3 flex items-center gap-3 text-xs tabular-nums">
                      <span>{place.viewCount} views</span>
                      <span>{place.saveCount} saves</span>
                      <span>
                        {place.reviewCount} reviews
                        {place.reviewCount > 0 && ` · ${place.averageRating.toFixed(1)}★`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id);
                      }}
                      className="text-primary mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
                    >
                      <BarChart3 className="size-3.5" aria-hidden />
                      {expandedPlaceId === place.id ? 'Hide' : 'Show'} last 30 days
                    </button>

                    {expandedPlaceId === place.id && (
                      <div className="mt-3">
                        {analytics.isPending && (
                          <div className="bg-surface-sunken h-20 animate-pulse rounded-md" />
                        )}
                        {analytics.data && <Sparkline data={analytics.data.daily} />}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="mt-3">
                <div className="mb-2.5 flex gap-2">
                  <Chip
                    selected={unansweredOnly}
                    onClick={() => {
                      setUnansweredOnly(true);
                    }}
                  >
                    Needs a reply
                  </Chip>
                  <Chip
                    selected={!unansweredOnly}
                    onClick={() => {
                      setUnansweredOnly(false);
                    }}
                  >
                    All
                  </Chip>
                </div>

                {reviews.data?.length === 0 && (
                  <EmptyState
                    icon={<MessageSquare className="size-7" aria-hidden />}
                    title={unansweredOnly ? 'Everything answered' : 'No reviews yet'}
                    description={
                      unansweredOnly
                        ? 'Every review on your places has a reply.'
                        : 'Reviews on your places will appear here.'
                    }
                  />
                )}

                <div className="space-y-2.5">
                  {reviews.data?.map((review) => (
                    <article key={review.id} className="bg-surface rounded-lg p-4 shadow-sm">
                      <p className="text-ink-subtle text-xs">{review.place.name}</p>
                      <p className="text-ink mt-1 text-sm font-semibold">
                        {review.authorName} · {review.rating}★
                      </p>
                      {review.content && (
                        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                          {review.content}
                        </p>
                      )}

                      {review.reply ? (
                        <p className="border-primary/30 bg-surface-sunken text-ink-muted mt-2.5 rounded-md border-l-2 p-2.5 text-sm">
                          {review.reply.content}
                        </p>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setReplyTo(review);
                          }}
                        >
                          Reply
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="h-6" />

      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason="Sign in to manage your business on Gonoplan."
      />
      <ReplySheet
        review={replyTo}
        onClose={() => {
          setReplyTo(null);
        }}
      />
    </div>
  );
}
