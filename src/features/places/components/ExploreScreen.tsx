'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, List, Map, Search, SlidersHorizontal } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api/errors';
import { Button } from '@/components/ui/Button';
import { PlaceListItem, PlaceListItemSkeleton } from './PlaceListItem';
import { PlaceSheet } from './PlaceSheet';
import { useNearbyPlaces } from '../hooks/usePlaces';
import { MapCanvas } from '@/features/map/components/MapCanvas';
import type { MapBounds } from '@/lib/map/types';
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
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

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
      */
      <div className="fixed inset-x-0 top-0 z-20 bottom-[var(--spacing-nav)] bg-background">
        <MapCanvas
          className="absolute inset-0"
          center={origin}
          categorySlugs={selectedSlugs}
          {...(coordinates ? { userLocation: coordinates } : {})}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onViewportChange={(next) => {
            setBounds(next);
          }}
        />

        {/* Floats over the map, matching the reference: the controls belong to
            the map, not to a bar above it. */}
        <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 px-4 pt-3">
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={() => {
                router.push('/search');
              }}
              className="flex h-12 flex-1 items-center gap-3 rounded-full bg-surface px-4 text-left shadow-md active:scale-[0.99]"
            >
              <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              <span className="truncate text-[0.9375rem] text-ink-subtle">
                {label ? `Search around ${label}` : 'Search places'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setView('list');
              }}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink shadow-md active:scale-[0.98]"
            >
              <List className="size-4" aria-hidden />
              List
            </button>
          </div>

          <div className="scrollbar-none pointer-events-auto mt-2 flex gap-2 overflow-x-auto pb-1">
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
        </div>

        {/* What is actually on screen, in the order the map would read.
            `pb-7` clears MapLibre's attribution strip, which sits at the map's
            bottom edge and is legally required — so the card moves, not it. */}
        <div className="absolute inset-x-0 bottom-0 pb-7">
          {placesInView.length === 0 ? (
            <p className="mx-4 rounded-lg bg-surface/95 px-4 py-3 text-center text-sm text-ink-muted shadow-md backdrop-blur-md">
              Nothing loaded in this area — try moving the map back, or widen
              your filters.
            </p>
          ) : (
            <div className="scrollbar-none flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4">
              {/* The horizontal row, not the tall card used in the rails.
                  A 4:3 photo card eats 40% of the screen, and on a map screen
                  every pixel the card takes is a pixel of map the user came
                  here for. */}
              {placesInView.map((place) => (
                <div key={place.id} className="snap-start">
                  <PlaceListItem
                    place={place}
                    onSelect={() => {
                      setSelectedPlaceId(place.id);
                    }}
                    className={cn(
                      'w-[17rem] shadow-md',
                      // The ringed card and the enlarged pin are the same fact
                      // stated twice, which is what makes the pairing readable
                      // while panning.
                      selectedPlaceId === place.id && 'ring-2 ring-primary',
                    )}
                  />
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
    <div className="px-safe">
      <header className="px-5 pt-safe">
        <h1 className="pt-6 text-[1.75rem] leading-tight font-semibold tracking-tight text-ink">
          Explore
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {label ? `Everything around ${label}` : 'Everything around you'}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              router.push('/search');
            }}
            className="flex h-12 flex-1 items-center gap-3 rounded-md bg-surface px-3.5 text-left shadow-sm transition-transform active:scale-[0.99]"
          >
            <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span className="text-[0.9375rem] text-ink-subtle">Search places</span>
          </button>

          {/* One button, not a segmented control: there are two views and the
              label names the one you are not looking at, which is the only
              thing you can act on. */}
          <button
            type="button"
            onClick={() => {
              setView('map');
            }}
            className="flex h-12 shrink-0 items-center gap-2 rounded-md bg-surface px-4 text-sm font-medium text-ink shadow-sm active:scale-[0.98]"
          >
            <Map className="size-4" aria-hidden />
            Map
          </button>
        </div>
      </header>

      {/* Filters sit above the list and scroll horizontally, so adding a
          fifteenth category never pushes the results off the screen. */}
      <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
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
            <p className="mb-2.5 text-xs text-ink-subtle">
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

      <PlaceSheet
        placeId={selectedPlaceId}
        onClose={() => {
          setSelectedPlaceId(null);
        }}
      />
    </div>
  );
}
