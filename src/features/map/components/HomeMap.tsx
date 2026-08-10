'use client';

import { useEffect, useMemo, useState } from 'react';
import { LocateFixed, MapPinOff } from 'lucide-react';
import { MapView } from './MapView';
import { CityPickerSheet } from '@/features/location/components/CityPickerSheet';
import { useLocationStore } from '@/features/location/store';
import { nearestCity } from '@/features/location/cities';
import { cn } from '@/lib/utils/cn';

/** Ho Chi Minh City — where the map opens before any location is resolved. */
const FALLBACK_CENTER = { latitude: 10.7769, longitude: 106.7009 };

/**
 * Composes the map with the location state machine.
 *
 * Every branch of that machine resolves to a usable map: GPS centres on the
 * user, a manual pick centres on a city, a denial opens the picker, and the
 * initial render falls back to a sensible default rather than a world view.
 * There is no state in which this renders nothing.
 */
export interface HomeMapProps {
  className?: string;
  selectedPlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
}

export function HomeMap({ className, selectedPlaceId = null, onSelectPlace }: HomeMapProps) {
  const { status, source, coordinates, label, requestLocation, setLabel } = useLocationStore();

  useEffect(() => {
    if (status === 'IDLE') void requestLocation();
  }, [status, requestLocation]);

  /*
   * Whether the picker is open is *derived*, not stored.
   *
   * The obvious version — an effect that watches `status` and calls
   * setPickerOpen(true) — causes a cascading render and needs a second piece of
   * state to stop it reopening forever. Deriving it during render means the
   * only state is the user's own decision, which is recorded in an event
   * handler where setState belongs.
   */
  const [dismissed, setDismissed] = useState(false);
  const [openedManually, setOpenedManually] = useState(false);

  const cannotLocate = status === 'DENIED' || status === 'UNAVAILABLE' || status === 'TIMEOUT';
  const pickerOpen = openedManually || (cannotLocate && !coordinates && !dismissed);

  const handlePickerOpenChange = (open: boolean) => {
    setOpenedManually(open);
    // Closing it is a decision: do not offer it again unprompted.
    if (!open) setDismissed(true);
  };

  // Label a GPS fix from the local city list rather than a metered reverse
  // geocode. Phase 6 upgrades this to the cached /geo/reverse proxy for
  // district-level precision; a city name is enough to be useful today.
  useEffect(() => {
    if (!coordinates || label) return;
    const city = nearestCity(coordinates);
    if (city) setLabel(city.name);
  }, [coordinates, label, setLabel]);

  const center = useMemo(
    () => coordinates ?? FALLBACK_CENTER,
    [coordinates],
  );

  const hasRealPosition = coordinates !== null && source === 'GPS';

  return (
    <div className={cn('relative', className)}>
      <MapView
        center={center}
        zoom={14}
        userLocation={hasRealPosition ? coordinates : null}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={(placeId) => {
          onSelectPlace?.(placeId);
        }}
        className="rounded-lg shadow-md"
      />

      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label={hasRealPosition ? 'Centre on my location' : 'Choose your location'}
          onClick={() => {
            if (cannotLocate) {
              setOpenedManually(true);
              setDismissed(false);
              return;
            }
            void requestLocation();
          }}
          className={cn(
            'flex size-10 items-center justify-center rounded-sm shadow-md backdrop-blur-sm',
            'transition-transform active:scale-95',
            hasRealPosition ? 'bg-surface/90 text-primary' : 'bg-accent-tint/95 text-accent',
          )}
        >
          {hasRealPosition ? (
            <LocateFixed className="size-5" aria-hidden />
          ) : (
            <MapPinOff className="size-5" aria-hidden />
          )}
        </button>
      </div>

      <CityPickerSheet open={pickerOpen} onOpenChange={handlePickerOpenChange} />
    </div>
  );
}
