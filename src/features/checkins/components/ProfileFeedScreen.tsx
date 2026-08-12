'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BadgeCheck,
  Camera,
  Grid3x3,
  MapPinned,
  Rows3,
  Settings,
  Star,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { fetchPublicUser } from '@/features/users/api';
import { useCurrentUser } from '@/features/auth/store';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { formatDate, formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils/cn';
import type { MessageKey } from '@/i18n/messages/keys';
import { CheckInCard } from './CheckInCard';
import { CheckInGrid, CheckInGridSkeleton } from './CheckInGrid';
import { CheckInComposer } from './CheckInComposer';
import { InfiniteSentinel } from './InfiniteSentinel';
import { ContributedPlaces, ReviewList } from '@/features/users/components/ProfileLists';
import { flattenCheckIns, useCheckIns, useDeleteCheckIn } from '../hooks';
import type { CheckIn } from '../api';

/**
 * The tabs, in the order they are shown.
 *
 * Declared once rather than inline in the bar, because the slide direction is
 * read off this order: moving right in the list moves the content left. Two
 * lists that could disagree about which tab comes first would produce a
 * transition that slides the wrong way, which reads as a glitch rather than as
 * a direction.
 */
const VIEWS = [
  { key: 'grid', icon: Grid3x3, labelKey: 'profile.viewGrid' },
  { key: 'feed', icon: Rows3, labelKey: 'profile.viewFeed' },
  { key: 'reviews', icon: Star, labelKey: 'profile.recentReviews' },
  { key: 'places', icon: MapPinned, labelKey: 'profile.contributed' },
] as const satisfies ReadonlyArray<{ key: string; icon: LucideIcon; labelKey: MessageKey }>;

type View = (typeof VIEWS)[number]['key'];

/**
 * Somebody's page: who they are, and everywhere they have been.
 *
 * This is the account's own tab. `/u/:id` shows the same photographs through
 * `CheckInGrid`, but keeps its own screen for now because it also carries the
 * recent reviews and the places somebody added — content this layout has no
 * slot for yet. The two should converge; they have not, and saying so beats a
 * comment claiming a reuse that is not there.
 */
export function ProfileFeedScreen({ userId }: { userId: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const currentUser = useCurrentUser();

  const isOwner = currentUser?.id === userId;
  const [view, setView] = useState<View>('grid');
  /*
   * Which way the next transition travels. `0` on first paint so nothing
   * slides in before anybody has asked for a tab.
   */
  const [direction, setDirection] = useState(0);

  const changeView = (next: View) => {
    const from = VIEWS.findIndex((item) => item.key === view);
    const to = VIEWS.findIndex((item) => item.key === next);
    setDirection(to > from ? 1 : -1);
    setView(next);
  };
  const [composing, setComposing] = useState(false);
  const [opened, setOpened] = useState<CheckIn | null>(null);

  const profile = useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchPublicUser(userId),
  });

  const feed = useCheckIns({ userId });
  const remove = useDeleteCheckIn(userId);

  const checkIns = flattenCheckIns(feed.data?.pages);
  const isPhotoView = view === 'grid' || view === 'feed';

  /*
   * Stable, because the sentinel's observer is rebuilt whenever this identity
   * changes — a new function every render would tear the observer down and set
   * it up again on each one, and an observer created mid-scroll fires
   * immediately for a target already on screen.
   *
   * The guard is not belt and braces: `rootMargin` means the sentinel is
   * "intersecting" for a whole screen of scrolling, so it fires repeatedly,
   * and React Query would happily start a second request for the same cursor.
   */
  const loadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  }, [feed]);

  const stats = [
    { key: 'checkIns', value: profile.data?.counts.checkIns ?? 0, label: t('profile.posts') },
    {
      key: 'placesVisited',
      value: profile.data?.counts.placesVisited ?? 0,
      label: t('profile.placesVisited'),
    },
    { key: 'reviews', value: profile.data?.counts.reviews ?? 0, label: t('profile.reviews') },
  ];

  return (
    <div className="px-safe">
      <header className="pt-safe-float px-5">
        <div className="flex items-start gap-4 pt-2">
          {/*
            Your own avatar comes from the session, not from the profile query.

            The upload writes the new URL into the session store and gets a
            fresh user back from the PATCH, so reading it here means the
            picture changes the instant it lands. Reading the query instead
            would leave the old face on screen until React Query decided to
            refetch — on the one screen where somebody is watching for it.
          */}
          <AvatarUpload
            name={(isOwner ? currentUser?.name : profile.data?.name) ?? '—'}
            url={isOwner ? currentUser?.avatarUrl : profile.data?.avatarUrl}
            editable={isOwner}
          />

          {/*
            The numbers beside the avatar, not under the name.

            Three columns sharing the row with the picture is the arrangement
            every app of this shape has settled on, and for a reason: it puts
            the one thing that changes — the counts — at a fixed place on the
            screen, so somebody who opens their profile to see whether the
            number went up does not have to read anything to find out.
          */}
          <ul className="flex flex-1 items-start justify-around pt-1.5">
            {stats.map((stat) => (
              <li key={stat.key} className="text-center">
                <p className="text-ink text-lg leading-none font-bold tabular-nums">
                  {formatNumber(stat.value, locale)}
                </p>
                <p className="text-ink-subtle text-2xs mt-1">{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3">
          <h1 className="text-ink flex items-center gap-1.5 text-lg font-semibold">
            <span className="truncate">{profile.data?.name ?? ' '}</span>
            {profile.data?.isReviewer && (
              <BadgeCheck
                className="text-primary size-4 shrink-0"
                aria-label={t('profile.reviewerBadge')}
              />
            )}
          </h1>

          {profile.data?.bio && (
            <p className="text-ink-muted mt-1 text-sm leading-relaxed">{profile.data.bio}</p>
          )}

          {profile.data && (
            <p className="text-ink-subtle mt-1 text-xs">
              {t('profile.joined', { date: formatDate(profile.data.joinedAt, locale) })}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="mt-4 flex gap-2">
            <Button
              fullWidth
              leadingIcon={<Camera className="size-4" aria-hidden />}
              onClick={() => {
                setComposing(true);
              }}
            >
              {t('checkin.compose')}
            </Button>
            <Button
              variant="secondary"
              aria-label={t('profile.settings')}
              // The same destination as the avatar in the home header, which
              // is the account screen — not the settings page one level below
              // it. Two entry points labelled the same thing landing on
              // different screens is how somebody learns not to trust either.
              onClick={() => {
                router.push('/profile');
              }}
              className="px-4"
            >
              <Settings className="size-[1.125rem]" aria-hidden />
            </Button>
          </div>
        )}
      </header>

      {/*
        Grid or feed.

        Both show the same posts, so this is not a filter — it is a reading
        distance. The grid is for a year at a glance, the feed is for one
        evening at a time, and which one somebody wants depends on why they
        opened the page rather than on anything about the data.
      */}
      <div className="border-border mt-5 flex border-b">
        {VIEWS.map((tab) => {
          const isActive = view === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                changeView(tab.key);
              }}
              aria-pressed={isActive}
              aria-label={t(tab.labelKey)}
              className="relative flex flex-1 items-center justify-center py-2.5"
            >
              <Icon
                className={cn(
                  'size-5 transition-colors',
                  isActive ? 'text-ink' : 'text-ink-subtle',
                )}
                aria-hidden
              />

              {/*
                One element that moves, not two that fade.

                `layoutId` hands the underline to whichever tab is active, so
                it travels between them. Two separately-animated bars would
                cross-fade in place, which reads as a state change rather than
                as the same object moving — and the movement is the part that
                says these two views are siblings.
              */}
              {isActive && (
                <motion.span
                  layoutId="profile-view-underline"
                  className="bg-ink absolute inset-x-0 -bottom-px mx-auto h-0.5 w-full rounded-full"
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                />
              )}
            </button>
          );
        })}
      </div>

      {/*
        Only the grid is edge to edge.

        This read `view === 'feed'`, so the two list tabs added later got no
        padding at all and their cards ran into the sides of the screen. The
        grid is the exception on purpose — its whole point is photographs
        meeting each other — and everything else is a column of cards, which
        needs the same gutter as the rest of the app.

        `overflow-x-hidden` because the content below slides horizontally on a
        tab change; without it a 24px travel is 24px of page nobody can scroll
        back from.
      */}
      <div className={cn('overflow-x-hidden', view !== 'grid' && 'px-5 py-4')}>
        {feed.isPending && (view === 'grid' ? <CheckInGridSkeleton /> : null)}

        {!feed.isPending && checkIns.length === 0 && (
          <EmptyState
            className="px-5 py-12"
            icon={<UserRound className="size-7" aria-hidden />}
            title={isOwner ? t('checkin.emptyOwnTitle') : t('checkin.emptyTitle')}
            description={isOwner ? t('checkin.emptyOwnBody') : undefined}
            action={
              isOwner ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setComposing(true);
                  }}
                >
                  {t('checkin.compose')}
                </Button>
              ) : undefined
            }
          />
        )}

        {/*
            Sideways, in the direction the tab moved.

            `mode="wait"` so the outgoing view finishes leaving before the new
            one arrives: overlapping two full lists means both are in the DOM
            at once, and on the grid tab that is two hundred photographs
            mounted to cross-fade between them.

            The old transition was a 6px lift, which said "this changed"
            without saying which way. Travel is what turns four tabs into a
            row you are moving along — the same reason the underline slides
            rather than fading.
          */}
        {(isPhotoView ? checkIns.length > 0 : true) && (
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={view}
              custom={direction}
              initial={reduceMotion ? false : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {view === 'grid' && <CheckInGrid checkIns={checkIns} onOpen={setOpened} />}

              {view === 'feed' && (
                <ul className="space-y-4">
                  {checkIns.map((checkIn) => (
                    <li key={checkIn.id}>
                      <CheckInCard
                        checkIn={checkIn}
                        onDelete={(target) => {
                          remove.mutate(target);
                        }}
                        deleting={remove.isPending}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/*
                The other two tabs read from the profile query, which already
                carries them — the same ten reviews and twelve places `/u/:id`
                shows. No second request, and no second layout: these are the
                components that screen renders, imported rather than rebuilt.
              */}
              {view === 'reviews' && <ReviewList reviews={profile.data?.recentReviews ?? []} />}
              {view === 'places' && <ContributedPlaces places={profile.data?.places ?? []} />}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Only the photo tabs page. The other two are a fixed, capped slice
            of the profile query — there is no next page to ask for. */}
        {isPhotoView && (
          <InfiniteSentinel
            hasMore={feed.hasNextPage}
            isLoading={feed.isFetchingNextPage}
            isError={feed.isFetchNextPageError}
            onLoad={loadMore}
          />
        )}
      </div>

      <div className="h-6" />

      {/*
        Tapping a tile opens the post rather than a lightbox.

        A grid tile is a crop of one photograph out of six, with no caption and
        no place — opening it full-bleed would show a bigger crop of the same
        missing context. The card is what the tile is a thumbnail *of*.
      */}
      <BottomSheet
        open={opened !== null}
        onOpenChange={() => {
          setOpened(null);
        }}
      >
        {opened && (
          <div className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
            <CheckInCard
              checkIn={opened}
              showAuthor
              onDelete={(target) => {
                remove.mutate(target);
                setOpened(null);
              }}
              deleting={remove.isPending}
            />
            <div className="h-4" />
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={composing} onOpenChange={setComposing}>
        {composing && (
          <CheckInComposer
            userId={currentUser?.id}
            onPosted={() => {
              setComposing(false);
              setView('grid');
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}
