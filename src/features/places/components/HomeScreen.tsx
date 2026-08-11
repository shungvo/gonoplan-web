'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, User } from 'lucide-react';
import { AuthSheet } from '@/features/auth/components/AuthSheet';
import { HomeMap } from '@/features/map/components/HomeMap';
import { LocationChip } from '@/features/location/components/LocationChip';
import { LocationPickerSheet } from '@/features/location/components/LocationPickerSheet';
import { useLocationStore } from '@/features/location/store';
import { useSessionStore } from '@/features/auth/store';
import { fetchCategories } from '@/features/categories/api';
import { pickRail, useCollections } from '@/features/recommendations/hooks';
import { track } from '@/features/recommendations/track';
import { PlaceRail } from './PlaceRail';
import { PlaceCardStack } from './PlaceCardStack';
import { PlaceGrid } from './PlaceGrid';
import { PlaceSheet } from './PlaceSheet';
import { formatDistance } from '@/lib/geo/grid';
import { useLocale, useT } from '@/i18n/I18nProvider';
import type { TranslateFn } from '@/i18n/translate';
import type { CollectionKey } from '@/features/recommendations/api';
import { categoryName } from '@/features/categories/name';
import { CategoryGlyph } from '@/features/categories/CategoryGlyph';
import { cn } from '@/lib/utils/cn';

/**
 * Section heading with an optional "View all".
 *
 * The link is only rendered when there is somewhere to go — a "View all" that
 * lands on the same eight places the section already shows is a promise the
 * screen cannot keep.
 */
function SectionHeading({
  title,
  note,
  onViewAll,
  viewAllLabel,
  className,
}: {
  title: string;
  note?: string | undefined;
  onViewAll?: (() => void) | undefined;
  viewAllLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 px-5', className)}>
      <h2 className="text-ink text-lg leading-tight font-semibold tracking-tight">
        {title}
        {note && <span className="text-ink-subtle ml-2 text-xs font-normal">{note}</span>}
      </h2>
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="text-primary shrink-0 text-sm font-medium"
        >
          {viewAllLabel}
        </button>
      )}
    </div>
  );
}

/** Ho Chi Minh City — used for the feed before any location is resolved. */
const FALLBACK_ORIGIN = { latitude: 10.7769, longitude: 106.7009 };

/**
 * A rail's heading, in the reader's language.
 *
 * The API sends a `title` as well as a `key`, and this deliberately uses the
 * key. Same rule as error codes: the wire carries a stable identifier and the
 * screen carries the prose, so translating a rail never depends on the server
 * knowing who is reading. `fallback` covers the rails the API omits — an
 * account-only one for a guest, an evening one before evening.
 */
function railTitle(t: TranslateFn, rail: { key: CollectionKey } | undefined, fallback: CollectionKey): string {
  return t(`collection.${rail?.key ?? fallback}.title`);
}

/**
 * Home (§14) — the discovery loop.
 *
 * Selection lives here rather than inside the map, because a marker tap and a
 * card tap must open the same sheet. Pushing it down into the map would leave
 * the rails unable to open anything, and lifting it to a global store would be
 * state nothing outside this screen ever reads.
 */
export function HomeScreen() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { coordinates, label, source } = useLocationStore();
  const { user } = useSessionStore();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const origin = coordinates ?? FALLBACK_ORIGIN;

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  /*
   * One ranked request for the whole screen (Phase 12).
   *
   * This used to be three separate nearby queries with different filters —
   * `minRating: 4.5` standing in for "recommended", `openNow` for "open right
   * now" — which is distance sort wearing three hats. All three are now the
   * same scorer with different weights, so a place is here because it scored
   * well rather than because it happened to be close.
   *
   * Fetched together because the home screen is the first thing anyone sees:
   * three requests over a Vietnamese mobile connection is the difference
   * between an app that opens and one that loads.
   */
  const collections = useCollections(origin, 12);

  /*
   * Rails are omitted by the API when they cannot apply — `recommended-for-you`
   * needs an account, `good-for-tonight` only exists after 16:00 — so each slot
   * names its fallbacks rather than binding to one key and going empty.
   */
  const featured = pickRail(collections.data, ['recommended-for-you', 'best-rated']);
  const nearby = pickRail(collections.data, ['popular-near-you']);
  const tonight = pickRail(collections.data, ['good-for-tonight', 'hidden-gems']);

  return (
    <div className="px-safe">
      {/*
        Avatar, location, search — in that order down the screen.

        Location and search shared one bar before this, which read as a single
        control and left no room for the place name to breathe. Split, the
        location becomes the header's subject — it is the answer to "where am I
        looking?", which is the question the whole feed below depends on.
      */}
      <header className="pt-safe-float px-5">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label={user ? t('home.signedInAs', { name: user.name }) : t('common.signIn')}
            className="bg-primary-tint text-primary flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold shadow-sm"
          >
            {user ? (
              user.name.trim().charAt(0).toUpperCase()
            ) : (
              <User className="size-5" aria-hidden />
            )}
          </Link>

          <div className="flex min-w-0 flex-1 justify-center">
            {/* The whole feed below is scoped to this point, so the control
                that states it is also the control that changes it. */}
            <LocationChip
              variant="header"
              onPickLocation={() => {
                setLocationOpen(true);
              }}
            />
          </div>

          {/*
            The reference puts a notification bell here. Gonoplan has no
            notifications — no endpoint, no model, nothing that could ever put a
            dot on it — and a bell that opens onto nothing teaches people to
            ignore the one place the app will later need them to look. The
            spacer keeps the location optically centred until there is
            something real to put here.
          */}
          <span className="size-11 shrink-0" aria-hidden />
        </div>

        <button
          type="button"
          onClick={() => {
            router.push('/search');
          }}
          className="bg-surface mt-4 flex h-12 w-full items-center gap-3 rounded-full px-4 text-left shadow-md active:scale-[0.99]"
        >
          <Search className="text-ink-subtle size-4 shrink-0" aria-hidden />
          <span className="text-ink-subtle truncate text-[0.9375rem]">
            {t('home.searchPlaceholder')}
          </span>
        </button>
      </header>

      {/*
        The stack leads, before the map.
        A map answers "what is around me" only once you already know what you
        are looking for; on open, a specific suggestion is the faster route to
        a decision. The map is still one scroll away for anyone who wants it.
      */}
      <section className="mt-5" aria-label={railTitle(t, featured, 'recommended-for-you')}>
        <SectionHeading
          title={railTitle(t, featured, 'recommended-for-you')}
          viewAllLabel={t('home.viewAll')}
          onViewAll={() => {
            router.push('/explore');
          }}
        />
        <PlaceCardStack
          className="mt-3"
          places={featured?.places}
          isPending={collections.isPending}
          onSelect={(place) => {
            track(place.id, 'CLICK', 'HOME_FEED');
            setSelectedPlaceId(place.id);
          }}
        />
      </section>

      {/* Categories, between the suggestion and the list.
          It is the pivot: the stack answers "somewhere specific", the grid
          answers "what is close", and this is how you say "actually, coffee".
          Each chip lands on Explore already filtered rather than filtering in
          place, because the answer is a list and this screen is not one. */}
      <section className="mt-7" aria-label={t('home.categories')}>
        <SectionHeading
          title={t('home.categories')}
          viewAllLabel={t('home.viewAll')}
          onViewAll={() => {
            router.push('/explore');
          }}
        />
        <div className="mt-3 flex snap-x snap-mandatory scroll-pl-5 scrollbar-none gap-2 overflow-x-auto px-5 pb-1">
          {/* The tree's roots are the top-level categories — flattening would
              mix subcategories in and make the row twice as long for no gain. */}
          {categories.data
            ? categories.data.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    router.push(`/explore?category=${category.slug}`);
                  }}
                  className="border-border bg-surface text-ink inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium transition-transform active:scale-[0.97]"
                >
                  {/*
                    The category's own glyph, in the category's own colour.

                    A coloured dot is a legend without a key: it says these
                    eight things differ without saying how, and the reader has
                    to get to the word anyway. The same glyph is already on the
                    map pins and in search, so the shape is worth something
                    before the word is read.
                  */}
                  <CategoryGlyph
                    slug={category.slug}
                    color={category.colorHex}
                    className="size-[1.125rem] shrink-0"
                    strokeWidth={2}
                  />
                  {categoryName(category, locale)}
                </button>
              ))
            : Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="bg-surface-sunken h-11 w-28 shrink-0 animate-pulse rounded-full"
                />
              ))}
        </div>
      </section>

      <section className="mt-7" aria-label={railTitle(t, nearby, 'popular-near-you')}>
        <SectionHeading
          title={railTitle(t, nearby, 'popular-near-you')}
          // Says so out loud when the search had to widen, rather than
          // silently showing places an hour away as if they were nearby.
          note={
            nearby?.widened
              ? t('home.withinRadius', { distance: formatDistance(nearby.radiusMeters, locale) })
              : undefined
          }
          viewAllLabel={t('home.viewAll')}
          onViewAll={() => {
            router.push('/explore');
          }}
        />
        <PlaceGrid
          className="mt-3"
          places={nearby?.places.slice(0, 4)}
          isPending={collections.isPending}
          onSelect={(place) => {
            track(place.id, 'CLICK', 'HOME_FEED');
            setSelectedPlaceId(place.id);
          }}
          onRequireAuth={() => {
            setAuthOpen(true);
          }}
        />
      </section>

      <section className="mt-7 px-5" aria-label={t('home.map')}>
        <SectionHeading title={t('home.onTheMap')} className="px-0 pb-3" />
        <HomeMap
          className="h-72"
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
        />
      </section>

      {/* Late in the day this is "Good for tonight"; the rest of the time the
          API sends "Hidden gems" instead, and the heading follows the data
          rather than claiming an evening that has not arrived. */}
      <div className="mt-7">
        <PlaceRail
          title={railTitle(t, tonight, 'good-for-tonight')}
          places={tonight?.places}
          isPending={collections.isPending}
          onSelect={(place) => {
            track(place.id, 'CLICK', 'HOME_FEED');
            setSelectedPlaceId(place.id);
          }}
          emptyMessage={t('home.nothingOpen')}
        />
      </div>

      {/* Only shown once we know where the user is — until then the label would
          claim a precision the app does not have. */}
      {label && source !== 'NONE' && (
        <p className="text-ink-subtle mt-7 px-5 text-center text-xs">
          {t('home.showingAround', { label })}
        </p>
      )}

      <div className="h-6" />

      <PlaceSheet
        placeId={selectedPlaceId}
        onClose={() => {
          setSelectedPlaceId(null);
        }}
      />

      {/* The grid's bookmarks need somewhere to send a signed-out visitor. The
          sheet carries its own; the grid had nothing, so tapping save while
          signed out did precisely nothing. */}
      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} reason={t('detail.signInToSave')} />

      <LocationPickerSheet open={locationOpen} onOpenChange={setLocationOpen} />
    </div>
  );
}
