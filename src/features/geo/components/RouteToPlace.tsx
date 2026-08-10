'use client';

import { useState } from 'react';
import { Bike, Car, Footprints, MapPin, Navigation, type LucideIcon } from 'lucide-react';
import { MapCanvas } from '@/features/map/components/MapCanvas';
import { Button } from '@/components/ui/Button';
import { useLocationStore } from '@/features/location/store';
import { formatDistance } from '@/lib/geo/grid';
import { cn } from '@/lib/utils/cn';
import { trackNow } from '@/features/recommendations/track';
import { useDirections, formatDuration } from '../useDirections';
import type { TravelMode } from '../api';

interface ModeOption {
  mode: TravelMode;
  label: string;
  icon: LucideIcon;
}

/**
 * Driving first: this is a city app in Vietnam, where the answer to "how do I
 * get there" is a motorbike far more often than it is anything else, and the
 * routing provider treats two wheels as driving.
 */
const MODES: ModeOption[] = [
  { mode: 'driving', label: 'Drive', icon: Car },
  { mode: 'cycling', label: 'Cycle', icon: Bike },
  { mode: 'walking', label: 'Walk', icon: Footprints },
];

/**
 * "How do I get there" on the place detail screen.
 *
 * A map, a line, and the two numbers that decide whether someone goes: how long
 * and how far. The map is deliberately inert — it sits inside a scrolling page,
 * and a pannable map there turns every scroll that starts on it into an
 * argument about who owns the gesture.
 */
export function RouteToPlace({
  place,
}: {
  place: { id: string; name: string; latitude: number; longitude: number; address: string | null };
}) {
  const { coordinates, status, requestLocation } = useLocationStore();
  const [mode, setMode] = useState<TravelMode>('driving');

  const destination = { latitude: place.latitude, longitude: place.longitude };
  const directions = useDirections(coordinates, destination, mode);

  /*
   * Someone else's turn-by-turn, on purpose.
   *
   * We can draw the line and say how long it takes; we cannot do lane guidance,
   * live traffic or a voice telling you to turn. Handing off at the moment the
   * user actually sets off is the honest boundary — and it is the one thing on
   * this screen where being a web app instead of a native one costs nothing,
   * because the maps app they already use opens either way.
   */
  const handoffUrl = coordinates
    ? `https://www.google.com/maps/dir/?api=1&origin=${String(coordinates.latitude)},${String(coordinates.longitude)}&destination=${String(place.latitude)},${String(place.longitude)}&travelmode=${mode}`
    : `https://www.google.com/maps/search/?api=1&query=${String(place.latitude)},${String(place.longitude)}`;

  return (
    <section className="border-border mt-5 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-ink text-sm font-semibold">Getting there</h2>

        {coordinates && (
          <div
            className="bg-surface-sunken flex rounded-full p-0.5"
            role="group"
            aria-label="Travel mode"
          >
            {MODES.map(({ mode: value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                }}
                aria-pressed={mode === value}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                  mode === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The map keeps its own rounded box rather than bleeding to the page
          edges: inside a column of cards a full-bleed map reads as a mistake. */}
      <div className="border-border relative mt-3 h-52 overflow-hidden rounded-md border">
        <MapCanvas
          className="absolute inset-0"
          center={destination}
          zoom={15}
          destination={destination}
          {...(coordinates ? { userLocation: coordinates } : {})}
          route={directions.data?.geometry ?? null}
          showPlaceMarkers={false}
          showZoomControls={false}
          interactive={false}
          // Even padding and far less of it: nothing floats over this map, and
          // the screen-sized default is taller than the preview itself.
          routePadding={{ top: 24, bottom: 24, left: 24, right: 24 }}
        />

        {/* Over the map, so the whole card is one tap target for the handoff.
            An inert map that does nothing on tap is a screenshot. */}
        <a
          href={handoffUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0"
          aria-label={`Open directions to ${place.name} in Google Maps`}
          onClick={() => {
            trackNow(place.id, 'DIRECTIONS', 'DETAIL');
          }}
        />
      </div>

      {/*
        Three states, all designed. The middle one is the reason this is not
        just a map: without a position there is no route to draw, and the fix
        is one tap rather than an explanation.
      */}
      {!coordinates ? (
        <div className="bg-surface-sunken mt-3 rounded-md px-3.5 py-3">
          <p className="text-ink-muted text-sm">
            {status === 'DENIED'
              ? 'Location is blocked, so we cannot measure the trip from where you are. You can still open directions in Maps.'
              : 'Share your location to see how long it takes to get here.'}
          </p>
          {status !== 'DENIED' && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2.5"
              onClick={() => {
                void requestLocation();
              }}
            >
              <MapPin className="size-4" aria-hidden />
              Use my location
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            {directions.isPending && <span className="text-ink-muted">Finding a route…</span>}
            {directions.error && (
              <span className="text-ink-muted">
                No {mode} route we can measure — Maps may still have one.
              </span>
            )}
            {directions.data && (
              <>
                <span className="text-ink font-semibold">
                  {formatDuration(directions.data.durationS)}
                </span>
                <span className="text-ink-muted">
                  {' · '}
                  {formatDistance(directions.data.distanceM)}
                  {directions.data.isFallbackProvider && ' · estimated'}
                </span>
              </>
            )}
          </p>

          {/* Quiet on purpose. The loud "Directions" belongs to the screen —
              the fixed bar on the page, the action row in the sheet — and two
              filled blue pills within one scroll of each other read as a
              mistake rather than as emphasis. The map above is already the
              tap target; this is the label for it. */}
          <a
            href={handoffUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex h-10 shrink-0 items-center gap-1.5 text-sm font-semibold"
            onClick={() => {
              trackNow(place.id, 'DIRECTIONS', 'DETAIL');
            }}
          >
            <Navigation className="size-4" aria-hidden />
            Open in Maps
          </a>
        </div>
      )}

      {place.address && (
        <p className="text-ink-subtle mt-2.5 flex items-start gap-1.5 text-xs">
          <MapPin className="mt-px size-3.5 shrink-0" aria-hidden />
          {place.address}
        </p>
      )}
    </section>
  );
}
