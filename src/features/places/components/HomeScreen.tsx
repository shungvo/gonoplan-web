'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { HomeMap } from '@/features/map/components/HomeMap';
import { LocationChip } from '@/features/location/components/LocationChip';
import { useLocationStore } from '@/features/location/store';
import { useNearbyPlaces } from '../hooks/usePlaces';
import { PlaceRail } from './PlaceRail';
import { PlaceSheet } from './PlaceSheet';
import { formatDistance } from '@/lib/geo/grid';

/** Ho Chi Minh City — used for the feed before any location is resolved. */
const FALLBACK_ORIGIN = { latitude: 10.7769, longitude: 106.7009 };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
  const router = useRouter();
  const { coordinates, label, source } = useLocationStore();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const origin = coordinates ?? FALLBACK_ORIGIN;

  const popular = useNearbyPlaces(origin, { limit: 12 });
  const bestRated = useNearbyPlaces(origin, { limit: 12, minRating: 4.5 });
  const openNow = useNearbyPlaces(origin, { limit: 12, openNow: true });

  return (
    <div className="px-safe">
      <header className="px-5 pt-safe">
        <div className="pt-4">
          <p className="text-sm text-ink-muted">{greeting()} 👋</p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-semibold tracking-tight text-ink">
            Where to today?
          </h1>
        </div>

        <div className="mt-3">
          <LocationChip />
        </div>

        {/* A button rather than an input: tapping navigates to the search
            screen, where the keyboard, recents and suggestions live. An inline
            input here would need all of that on the home screen too. */}
        <button
          type="button"
          onClick={() => {
            router.push('/search');
          }}
          className="mt-4 flex h-13 w-full items-center gap-3 rounded-lg bg-surface px-4 text-left shadow-md transition-transform active:scale-[0.99]"
        >
          <Search className="size-5 shrink-0 text-ink-subtle" aria-hidden />
          <span className="text-[0.9375rem] text-ink-subtle">Where do you want to go?</span>
        </button>
      </header>

      <section className="mt-5 px-5" aria-label="Map">
        <HomeMap
          className="h-72"
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
        />
      </section>

      <div className="mt-7 space-y-7">
        <PlaceRail
          title="Popular near you"
          places={popular.data?.places}
          isPending={popular.isPending}
          onSelect={(place) => {
            setSelectedPlaceId(place.id);
          }}
          priority
          // Says so out loud when the search had to widen, rather than
          // silently showing places an hour away as if they were nearby.
          note={
            popular.data?.widened
              ? `within ${formatDistance(popular.data.radiusMeters)}`
              : undefined
          }
          emptyMessage="No places around here yet. Gonoplan is still filling in this area."
        />

        <PlaceRail
          title="Best rated"
          places={bestRated.data?.places}
          isPending={bestRated.isPending}
          onSelect={(place) => {
            setSelectedPlaceId(place.id);
          }}
          emptyMessage="Nothing rated 4.5 or above nearby yet."
        />

        <PlaceRail
          title="Open right now"
          places={openNow.data?.places}
          isPending={openNow.isPending}
          onSelect={(place) => {
            setSelectedPlaceId(place.id);
          }}
          emptyMessage="Everything nearby is closed at the moment."
        />
      </div>

      {/* Only shown once we know where the user is — until then the label would
          claim a precision the app does not have. */}
      {label && source !== 'NONE' && (
        <p className="mt-7 px-5 text-center text-xs text-ink-subtle">
          Showing places around {label}
        </p>
      )}

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
