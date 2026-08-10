'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Compass, SlidersHorizontal } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PlaceListItem, PlaceListItemSkeleton } from './PlaceListItem';
import { PlaceSheet } from './PlaceSheet';
import { useNearbyPlaces } from '../hooks/usePlaces';
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
  const { coordinates, label } = useLocationStore();
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const origin = coordinates ?? FALLBACK_ORIGIN;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const { data, isPending } = useNearbyPlaces(origin, {
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

  return (
    <div className="px-safe">
      <header className="px-5 pt-safe">
        <h1 className="pt-6 text-[1.75rem] leading-tight font-semibold tracking-tight text-ink">
          Explore
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {label ? `Everything around ${label}` : 'Everything around you'}
        </p>
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

        {!isPending && data && data.places.length === 0 && (
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

        {!isPending && data && data.places.length > 0 && (
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
