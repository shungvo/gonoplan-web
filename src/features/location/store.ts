'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Coordinates } from '@/lib/geo/grid';

/**
 * Location permission is a state machine, not a boolean.
 *
 * `DENIED` and `UNAVAILABLE` are designed screens, not error toasts (§34):
 * the app stays fully usable with a manually chosen city. Treating this as
 * `hasLocation: boolean` is what produces apps that show a blank map and a
 * spinner forever when someone taps "Don't Allow".
 */
export type LocationStatus =
  | 'IDLE'
  | 'PROMPTING'
  | 'GRANTED'
  | 'DENIED'
  | 'UNAVAILABLE'
  | 'TIMEOUT';

/** Where the current coordinates came from — drives what the UI says. */
export type LocationSource = 'GPS' | 'MANUAL' | 'LAST_KNOWN' | 'NONE';

export interface LocationState {
  status: LocationStatus;
  source: LocationSource;
  coordinates: Coordinates | null;
  /** Reverse-geocoded label, e.g. "Ho Chi Minh City". */
  label: string | null;
  accuracyMeters: number | null;
  updatedAt: number | null;

  requestLocation: () => Promise<void>;
  setManualLocation: (coordinates: Coordinates, label: string) => void;
  setLabel: (label: string) => void;
  reset: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  // A minute-old fix is fine for "what's near me" and avoids waking the GPS
  // radio on every mount — the single biggest battery cost in a map app.
  maximumAge: 60_000,
  timeout: 8_000,
  enableHighAccuracy: false,
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      status: 'IDLE',
      source: 'NONE',
      coordinates: null,
      label: null,
      accuracyMeters: null,
      updatedAt: null,

      async requestLocation() {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
          set({ status: 'UNAVAILABLE' });
          return;
        }

        set({ status: 'PROMPTING' });

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
          });

          set({
            status: 'GRANTED',
            source: 'GPS',
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            accuracyMeters: position.coords.accuracy,
            updatedAt: Date.now(),
          });
        } catch (error) {
          const code = (error as GeolocationPositionError | undefined)?.code;
          const previous = get().coordinates;

          set({
            status:
              code === 1 /* PERMISSION_DENIED */
                ? 'DENIED'
                : code === 3 /* TIMEOUT */
                  ? 'TIMEOUT'
                  : 'UNAVAILABLE',
            // A persisted position is far better than nothing: the app keeps
            // working, and the UI can label it "last known" honestly.
            source: previous ? 'LAST_KNOWN' : 'NONE',
          });
        }
      },

      setManualLocation(coordinates, label) {
        set({
          status: 'GRANTED',
          source: 'MANUAL',
          coordinates,
          label,
          accuracyMeters: null,
          updatedAt: Date.now(),
        });
      },

      setLabel(label) {
        set({ label });
      },

      reset() {
        set({
          status: 'IDLE',
          source: 'NONE',
          coordinates: null,
          label: null,
          accuracyMeters: null,
          updatedAt: null,
        });
      },
    }),
    {
      name: 'gonoplan:location',
      storage: createJSONStorage(() => localStorage),
      // `status` is deliberately not persisted: permission can be revoked in
      // browser settings between sessions, so it must be re-derived at
      // runtime rather than trusted from storage.
      partialize: (state) => ({
        coordinates: state.coordinates,
        label: state.label,
        source: state.source,
        updatedAt: state.updatedAt,
      }),
    },
  ),
);

/** True when there is a usable position, however it was obtained. */
export function useHasLocation(): boolean {
  return useLocationStore((state) => state.coordinates !== null);
}
