'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { MapPin, Search, Navigation } from 'lucide-react';
import { CITIES, searchCities, type City } from '../cities';
import { useLocationStore } from '../store';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';

interface CityPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The screen someone sees when location is denied or unavailable.
 *
 * §34 is explicit that the app must keep working without GPS. This is that
 * promise made concrete: pick a city and every feature behaves exactly as it
 * would with a satellite fix. Treating a denial as an error toast — the common
 * shortcut — leaves the user staring at a blank map with no way forward.
 */
export function CityPickerSheet({ open, onOpenChange }: CityPickerSheetProps) {
  const [query, setQuery] = useState('');
  const { status, setManualLocation, requestLocation } = useLocationStore();

  const results = searchCities(query);
  const wasDenied = status === 'DENIED';

  const choose = (city: City) => {
    setManualLocation({ latitude: city.latitude, longitude: city.longitude }, city.name);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} className="h-[82dvh]">

          <div className="px-5 pt-4 pb-3">
            <Drawer.Title className="text-xl font-semibold tracking-tight text-ink">
              Choose your location
            </Drawer.Title>
            <Drawer.Description className="mt-1 text-sm leading-relaxed text-ink-muted">
              {wasDenied
                ? 'Location is turned off for Gonoplan. Pick a city and everything still works.'
                : 'We could not find you automatically. Pick a city to start exploring.'}
            </Drawer.Description>
          </div>

          {wasDenied && (
            <div className="px-5 pb-3">
              {/* Offered, not nagged. Browsers remember a denial, so this only
                  helps someone who has since changed the setting. */}
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                leadingIcon={<Navigation className="size-4" aria-hidden />}
                onClick={() => {
                  void requestLocation();
                }}
              >
                Try using my location again
              </Button>
            </div>
          )}

          <div className="px-5 pb-3">
            <div className="flex h-12 items-center gap-2.5 rounded-md bg-surface-sunken px-3.5">
              <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search a city"
                aria-label="Search a city"
                className="w-full bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-subtle"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-safe">
            {results.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">
                No city matches “{query}”.
              </p>
            ) : (
              <ul className="pb-6">
                {results.map((city) => (
                  <li key={city.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        choose(city);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-1 py-3 text-left transition-colors active:bg-surface-sunken"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary-tint text-primary">
                        <MapPin className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] font-medium text-ink">
                          {city.name}
                        </span>
                        <span className="block truncate text-sm text-ink-muted">
                          {city.nameVi}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
    </BottomSheet>
  );
}

export { CITIES };
