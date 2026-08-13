'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reverseGeocodeOrNull, type Address } from '@/features/geo/api';
import type { Coordinates } from '@/lib/geo/grid';
import { nearestCity } from './cities';
import { useLocationStore } from './store';

/**
 * The shortest address that still answers "where am I".
 *
 * A geocoder's `formatted` runs to the country — "Sở Nông nghiệp…, 63, Lý Tự
 * Trọng, Khu phố 3, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71006, Việt Nam" —
 * and this goes in a chip that truncates, so the full string gets cut off
 * exactly where the useful part is.
 *
 * The rule is the two most specific parts the geocoder actually returned, not
 * a fixed pair. A first attempt hard-coded street-then-district and produced
 * "63 Lý Tự Trọng, Thành phố Hồ Chí Minh" on real data, because HCMC's 2025
 * reform folded the districts into wards: the geocoder returns a ward and no
 * district at all, and reaching past the empty rung landed on the province.
 * Taking whatever two are most specific gives "63 Lý Tự Trọng, Phường Sài
 * Gòn" there and "Lê Lợi, Quận 1" where districts still exist, with no
 * knowledge of either administrative scheme in the code.
 *
 * `formatted` is the floor rather than the first choice: a long truncated
 * label still beats an empty chip.
 */
export function shortAddressLabel(address: Address): string {
  const parts = [address.street, address.ward, address.district, address.province]
    .map((part) => abbreviate(part?.trim()))
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.slice(0, 2).join(', ') : address.formatted;
}

/**
 * How the same address is written on a sign.
 *
 * A geocoder spells the administrative prefix out in full, and "Phường" costs
 * six characters of a chip that has room for about twenty-five — "63 Lý Tự
 * Trọng, Phường Sà…" was cutting the ward in half to spell out a word carrying
 * no information. Every one of these is the standard written form in
 * Vietnamese, and it is what Goong prints on the basemap underneath, so the
 * chip and the map now say the same thing the same way.
 *
 * "Tỉnh" goes entirely: nobody says "Tỉnh Quảng Nam" when they mean Quảng Nam.
 */
const PREFIXES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^Thành phố\s+/iu, 'TP.'],
  [/^Thị trấn\s+/iu, 'TT.'],
  [/^Thị xã\s+/iu, 'TX.'],
  [/^Phường\s+/iu, 'P.'],
  [/^Quận\s+/iu, 'Q.'],
  [/^Huyện\s+/iu, 'H.'],
  [/^Tỉnh\s+/iu, ''],
];

function abbreviate(part: string | undefined): string | undefined {
  if (!part) return part;

  for (const [pattern, replacement] of PREFIXES) {
    if (pattern.test(part)) return part.replace(pattern, replacement);
  }

  return part;
}

/**
 * Four decimal places is about eleven metres.
 *
 * The same rounding the API caches on, so a GPS fix drifting by a few metres
 * on a still phone cannot cost a second lookup — and every caller asking about
 * the same spot shares one answer.
 */
function positionKey(at: Coordinates): string {
  return `${at.latitude.toFixed(4)},${at.longitude.toFixed(4)}`;
}

/**
 * Gives a GPS fix its name.
 *
 * This used to be a lookup in a hard-coded list of cities, which meant the
 * chip read "Ho Chi Minh City" from anywhere in the city — true, and useless
 * for an app whose whole premise is what is near you. The city list stays as
 * the fallback, where being approximately right is the entire job.
 *
 * Only for GPS. A manual choice already carries the name the person tapped,
 * and replacing it with a geocoder's version of the same place would overwrite
 * their words with ours.
 *
 * Belongs to the chip rather than to the map: the label is shown on every
 * screen with a location control, and living in `HomeMap` meant a session that
 * opened straight to Explore had a position with nothing to call it.
 */
export function useLocationLabel(): void {
  const coordinates = useLocationStore((state) => state.coordinates);
  const source = useLocationStore((state) => state.source);
  const label = useLocationStore((state) => state.label);
  const setLabel = useLocationStore((state) => state.setLabel);

  const wanted = coordinates !== null && source === 'GPS' && label === null;

  const { data, isError } = useQuery({
    queryKey: ['geo', 'reverse', coordinates ? positionKey(coordinates) : null],
    queryFn: () => (coordinates ? reverseGeocodeOrNull(coordinates) : Promise.resolve(null)),
    enabled: wanted,
    // An address does not move. Refetching one is a metered call for an answer
    // that cannot have changed.
    staleTime: Infinity,
    // A geocoder that is down or rate limiting stays down for this fix; the
    // city fallback is immediate and good enough to not be worth retrying for.
    retry: false,
  });

  useEffect(() => {
    if (!wanted || !coordinates) return;

    if (data) {
      setLabel(shortAddressLabel(data));
      return;
    }

    // `null` is a real answer — the sea, a new development — and an error is a
    // provider problem. Neither should leave the chip saying "finding you…"
    // forever, so both land on the city.
    if (data === null || isError) {
      const city = nearestCity(coordinates);
      if (city) setLabel(city.name);
    }
  }, [wanted, coordinates, data, isError, setLabel]);
}
