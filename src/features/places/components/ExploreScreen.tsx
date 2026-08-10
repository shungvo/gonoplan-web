'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, List, Map, Route, Search, SlidersHorizontal, X } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/Button';
import { PlaceListItem, PlaceListItemSkeleton } from './PlaceListItem';
import { PlaceSheet } from './PlaceSheet';
import { useNearbyPlaces } from '../hooks/usePlaces';
import { MapCanvas } from '@/features/map/components/MapCanvas';
import type { MapBounds } from '@/lib/map/types';
import { useDirections, formatDuration } from '@/features/geo/useDirections';
import { cn } from '@/lib/utils/cn';
import { fetchCategories } from '@/features/categories/api';
import { useLocationStore } from '@/features/location/store';
import { formatDistance } from '@/lib/geo/grid';

const FALLBACK_ORIGIN = { latitude: 10.7769, longitude: 106.7009 };

/**
 * Explore — browse everything nearby, filtered by category.
 *
 * A vertical list rather than the home rails: this is the screen for someone
 * who wants to compare options, and comparison needs a column, not a carousel.
 */
export function ExploreScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { coordinates, label } = useLocationStore();

  // Seeded from the URL so Home's category row can land here already filtered.
  // Read once, on mount: after that the chips own the state, and re-syncing
  // from the URL would fight every tap.
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() => {
    const initial = params.get('category');
    return initial ? [initial] : [];
  });
  const [openNow, setOpenNow] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [routeToId, setRouteToId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  /*
   * How tall the map's bottom overlay actually is, so the zoom buttons can sit
   * above whatever is really there.
   *
   * A static offset was wrong even when it looked right: the carousel measures
   * 145px, the "nothing here" message 108, and both change with the viewport —
   * the message wraps to two lines at 375px, and a long place name pushes a
   * card to three. Any fixed number is one wrapped line from putting the zoom
   * buttons back behind the cards, which is the bug this replaced. The 160px
   * seed matches the carousel so there is no jump on first paint.
   */
  const [bottomOverlayHeight, setBottomOverlayHeight] = useState(160);

  const measureBottomOverlay = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const size = entries[0]?.borderBoxSize[0]?.blockSize;
      setBottomOverlayHeight(size ?? node.offsetHeight);
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const origin = coordinates ?? FALLBACK_ORIGIN;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const { data, isPending, error, refetch } = useNearbyPlaces(origin, {
    limit: 30,
    categorySlugs: selectedSlugs,
    openNow,
  });

  const toggleCategory = (slug: string) => {
    setSelectedSlugs((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  };

  const hasFilters = selectedSlugs.length > 0 || openNow;

  /*
   * A route is drawn only when asked for, never because a place got selected.
   * Every fetch is a metered upstream call, and selection happens on every pin
   * tap and every card scroll — routing all of those would spend the quota on
   * curiosity rather than intent.
   */
  const routeTarget = data?.places.find((place) => place.id === routeToId) ?? null;
  const directions = useDirections(
    coordinates,
    routeTarget ? { latitude: routeTarget.latitude, longitude: routeTarget.longitude } : null,
  );

  /*
   * The carousel follows the map, filtered from what is already loaded.
   *
   * The marker endpoint returns coordinates and ids only — deliberately, so a
   * viewport full of pins is not a viewport full of place cards — so there is
   * nothing there to build a card from. Narrowing the list we already have
   * keeps the carousel honest about what is on screen without a second round
   * trip on every pan. Places outside the loaded radius are simply not in it,
   * which is the same limit the list view has.
   */
  const placesInView = (() => {
    const all = data?.places ?? [];
    if (!bounds) return all;
    return all.filter(
      (place) =>
        place.latitude >= bounds.minLat &&
        place.latitude <= bounds.maxLat &&
        place.longitude >= bounds.minLng &&
        place.longitude <= bounds.maxLng,
    );
  })();

  if (view === 'map') {
    return (
      /*
        Fixed rather than a tall child of the scroll container.

        The map has to own the whole viewport, and a scrollable page around a
        pannable map means every drag is ambiguous — the browser has to guess
        whether you meant to move the map or the page, and it guesses wrong
        often enough to feel broken. Stopping above the tab bar keeps the app's
        navigation reachable.

        The bottom edge is the nav's *whole* footprint, not just its height:
        `--spacing-nav` alone ignores the home indicator, so on a notched phone
        the map ran 34px past its own bottom and put the attribution — and the
        card row anchored to it — underneath the tab bar.
      */
      <div className="bg-background fixed inset-x-0 top-0 bottom-[var(--nav-clearance)] z-20">
        <MapCanvas
          className="absolute inset-0"
          // Measured, not guessed — see `bottomOverlayHeight`. The 16px is the
          // gap, so the buttons read as separate from the cards rather than
          // balanced on their top edge.
          controlsBottomOffset={`${String(bottomOverlayHeight + 16)}px`}
          center={origin}
          categorySlugs={selectedSlugs}
          {...(coordinates ? { userLocation: coordinates } : {})}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onViewportChange={(next) => {
            setBounds(next);
          }}
          route={directions.data?.geometry ?? null}
        />

        {/* Floats over the map, matching the reference: the controls belong to
            the map, not to a bar above it. */}
        <div className="pt-safe-float pointer-events-none absolute inset-x-0 top-0 px-4">
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={() => {
                router.push('/search');
              }}
              className="bg-surface flex h-12 flex-1 items-center gap-3 rounded-full px-4 text-left shadow-md active:scale-[0.99]"
            >
              <Search className="text-ink-subtle size-4 shrink-0" aria-hidden />
              <span className="text-ink-subtle truncate text-[0.9375rem]">
                {label ? `Search around ${label}` : 'Search places'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setView('list');
              }}
              className="bg-surface text-ink flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-md active:scale-[0.98]"
            >
              <List className="size-4" aria-hidden />
              List
            </button>
          </div>

          <div className="pointer-events-auto mt-2 flex scrollbar-none gap-2 overflow-x-auto pb-1">
            <Chip
              selected={openNow}
              onClick={() => {
                setOpenNow((value) => !value);
              }}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              Open now
            </Chip>
            {categories?.map((category) => (
              <Chip
                key={category.id}
                selected={selectedSlugs.includes(category.slug)}
                colorHex={category.colorHex}
                onClick={() => {
                  toggleCategory(category.slug);
                }}
              >
                {category.name}
              </Chip>
            ))}
          </div>

          {/*
            Under the filters, not above the carousel.

            It never replaces the card row — the list is how you pick a
            different destination, and hiding it the moment a route appears
            means backing out to change your mind. But absolutely positioned at
            `bottom-[8.5rem]` it landed 33px *inside* the cards, so the two
            fought for the same band the moment a route existed. Here it is a
            sibling of the chips instead, which puts it below them whatever the
            safe-area inset does to the header's height, and leaves the whole
            bottom of the map to the carousel.
          */}
          {routeTarget && (
            <div className="bg-surface pointer-events-auto mt-2 flex items-center gap-3 rounded-full px-4 py-2.5 shadow-lg">
              <Route className="text-primary size-4 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-sm">
                {directions.isPending && <span className="text-ink-muted">Finding a route…</span>}
                {directions.error && (
                  <span className="text-ink-muted">No route to {routeTarget.name}</span>
                )}
                {directions.data && (
                  <>
                    <span className="text-ink font-semibold">
                      {formatDuration(directions.data.durationS)}
                    </span>
                    <span className="text-ink-muted">
                      {' · '}
                      {formatDistance(directions.data.distanceM)} to {routeTarget.name}
                    </span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setRouteToId(null);
                }}
                aria-label="Clear route"
                className="text-ink-subtle -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {/* What is actually on screen, in the order the map would read.

            The padding clears MapLibre's attribution strip, which is legally
            required — so the card moves, not it. 44px is measured, not picked:
            the control sits 10px off the map's bottom edge and is 24px tall,
            so anything under 34px puts the licence text across the card. It
            was `pb-7` (28px), and it did exactly that. */}
        <div ref={measureBottomOverlay} className="absolute inset-x-0 bottom-0 pb-11">
          {placesInView.length === 0 ? (
            <p className="bg-surface/95 text-ink-muted mx-4 rounded-lg px-4 py-3 text-center text-sm shadow-md backdrop-blur-md">
              Nothing loaded in this area — try moving the map back, or widen your filters.
            </p>
          ) : (
            <div className="flex snap-x snap-mandatory scroll-pl-4 scrollbar-none gap-3 overflow-x-auto px-4">
              {/* The horizontal row, not the tall card used in the rails.
                  A 4:3 photo card eats 40% of the screen, and on a map screen
                  every pixel the card takes is a pixel of map the user came
                  here for. */}
              {placesInView.map((place) => (
                <div key={place.id} className="relative snap-start">
                  <PlaceListItem
                    place={place}
                    onSelect={() => {
                      setSelectedPlaceId(place.id);
                    }}
                    className={cn(
                      'w-[19rem] shadow-md',
                      // Room for the route button, which is positioned over
                      // this card rather than inside it. Without it the button
                      // sat on top of the distance — "120 m" arrived as "12"
                      // with a circle over the rest of it. The card widened to
                      // pay for the column instead of taking it from the name.
                      coordinates && 'pr-12',
                      // The ringed card and the enlarged pin are the same fact
                      // stated twice, which is what makes the pairing readable
                      // while panning.
                      selectedPlaceId === place.id && 'ring-primary ring-2',
                    )}
                  />
                  {/* Outside the card's own button, so a tap can say which of
                      the two it meant. Hidden without a position — a route from
                      nowhere is not a thing we can draw. */}
                  {coordinates && (
                    <button
                      type="button"
                      onClick={() => {
                        setRouteToId(place.id);
                      }}
                      aria-label={`Show the route to ${place.name}`}
                      className={cn(
                        'absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full shadow-sm',
                        routeToId === place.id
                          ? 'bg-primary text-white'
                          : 'bg-surface-sunken text-ink-muted',
                      )}
                    >
                      <Route className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <PlaceSheet
          placeId={selectedPlaceId}
          onClose={() => {
            setSelectedPlaceId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="px-safe relative">
      {/*
        The map sits behind the page, not inside it.

        `fixed` rather than a tall first child: the list scrolls over the map
        instead of dragging it along, so the map is revealed and covered by the
        same gesture that reads the list — no second scroll region, and no
        decision about which one a drag belongs to.

        `z-0`, emphatically not `-z-10`.

        A negative z-index paints *behind the in-flow content of the whole
        page*, and the app shell is `bg-background` — opaque white. So the map
        loaded its tiles, drew them, and was covered by two layers of white.
        That is the blank map: not the worker, not OpenFreeMap, not the tiles.
        `z-0` is a positioned layer, which paints above block backgrounds and
        below anything given a `z-10` of its own — so the chrome that has to
        sit over the map now says so explicitly, one class each.
      */}
      <div className="fixed inset-x-0 top-0 z-0 h-[38dvh]">
        <MapCanvas
          className="map-tucked absolute inset-0"
          showZoomControls={false}
          center={origin}
          zoom={14}
          categorySlugs={selectedSlugs}
          {...(coordinates ? { userLocation: coordinates } : {})}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
        />
      </div>

      {/* Transparent, so the map reads as the backdrop rather than as a panel
          beneath a bar. The controls keep their own surfaces — the text has to
          stay legible over whatever the map happens to show. */}
      <header className="pt-safe-float relative z-10 px-5">
        <div className="flex items-center gap-2">
          <h1 className="text-ink flex-1 text-[1.75rem] leading-tight font-semibold tracking-tight drop-shadow-[0_1px_2px_rgb(255_255_255/0.9)]">
            Explore
          </h1>
          <button
            type="button"
            onClick={() => {
              setView('map');
            }}
            className="bg-surface text-ink flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-md active:scale-[0.98]"
          >
            <Map className="size-4" aria-hidden />
            Full map
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            router.push('/search');
          }}
          className="bg-surface mt-3 flex h-12 w-full items-center gap-3 rounded-full px-4 text-left shadow-md active:scale-[0.99]"
        >
          <Search className="text-ink-subtle size-4 shrink-0" aria-hidden />
          <span className="text-ink-subtle text-[0.9375rem]">Search places</span>
        </button>
      </header>

      {/*
        Enough clear map to be worth showing.

        Sized so the user's own position sits above the sheet rather than
        behind it — a map you cannot see yourself on answers nothing.
      */}
      <div className="h-[22dvh]" aria-hidden />

      {/*
        The list, shaped like a sheet.

        It is a normal part of the page, not a Drawer: it is always present and
        never dismissed, so the sheet here is a shape rather than a component —
        and a real Drawer would add a second scroll region for the page to
        argue with.
      */}
      <div className="bg-surface shadow-sheet relative z-10 min-h-[70dvh] rounded-t-xl pb-2">
        {/*
          The bar needs a box of its own.

          As a bare `mt-2.5` child of a block container its top margin collapsed
          straight through the parent — measured at 0px from the sheet's top
          edge — so it drew across the 32px corner radius instead of below it,
          and the 10px of air ended up outside the sheet. A wrapper with height
          rather than margin cannot collapse, and it gives the bar the vertical
          centring it was faking.
        */}
        <div className="flex h-5 items-center justify-center" aria-hidden>
          <div className="bg-border h-1 w-10 rounded-full" />
        </div>

        {/* Filters sit above the list and scroll horizontally, so adding a
          fifteenth category never pushes the results off the screen. */}
        <div className="mt-3 flex scrollbar-none gap-2 overflow-x-auto px-5 pb-1">
          <Chip
            selected={openNow}
            onClick={() => {
              setOpenNow((value) => !value);
            }}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Open now
          </Chip>

          {categories?.map((category) => (
            <Chip
              key={category.id}
              selected={selectedSlugs.includes(category.slug)}
              colorHex={category.colorHex}
              onClick={() => {
                toggleCategory(category.slug);
              }}
            >
              {category.name}
            </Chip>
          ))}
        </div>

        <div className="mt-4 px-5">
          {isPending && (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }, (_, index) => (
                <PlaceListItemSkeleton key={index} />
              ))}
            </div>
          )}

          {/*
          A failed request used to fall through every branch below and render
          nothing at all — a blank screen under a working filter bar, which
          reads as "there is nothing here" rather than "this broke". That is
          how a 500 on category filtering stayed invisible.
        */}
          {!isPending && error && (
            <EmptyState
              icon={<Compass className="size-7" aria-hidden />}
              title="Could not load places"
              description={
                error instanceof ApiError && error.isRetryable
                  ? 'Check your connection and try again.'
                  : 'Something went wrong at our end. Try again in a moment.'
              }
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  Try again
                </Button>
              }
            />
          )}

          {!isPending && !error && data && data.places.length === 0 && (
            <EmptyState
              icon={<Compass className="size-7" aria-hidden />}
              title={hasFilters ? 'Nothing matches your filters' : 'Nothing around here yet'}
              description={
                hasFilters
                  ? 'Try removing a filter or widening your search.'
                  : 'Gonoplan is still filling in this area. Try another city from the location picker.'
              }
              action={
                hasFilters ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedSlugs([]);
                      setOpenNow(false);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {!isPending && !error && data && data.places.length > 0 && (
            <>
              <p className="text-ink-subtle mb-2.5 text-xs">
                {data.places.length} places
                {data.widened && ` within ${formatDistance(data.radiusMeters)}`}
              </p>
              <ul className="space-y-2.5">
                {data.places.map((place) => (
                  <li key={place.id}>
                    <PlaceListItem
                      place={place}
                      onSelect={() => {
                        setSelectedPlaceId(place.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="h-6" />
      </div>

      <PlaceSheet
        placeId={selectedPlaceId}
        onClose={() => {
          setSelectedPlaceId(null);
        }}
      />
    </div>
  );
}
