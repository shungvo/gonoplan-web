import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/types/api';

export type Route = components['schemas']['Route'];
export type TravelMode = Route['mode'];
export type Address = components['schemas']['Address'];
export type AddressSuggestion = components['schemas']['AddressSuggestion'];

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** `nearLat`/`nearLng` are both-or-neither at the API boundary. */
function nearQuery(near?: LatLng): Record<string, number> {
  return near ? { nearLat: near.latitude, nearLng: near.longitude } : {};
}

export function fetchDirections(params: {
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  mode: TravelMode;
}): Promise<Route> {
  return api.get<Route>('/geo/directions', {
    query: {
      fromLat: params.from.latitude,
      fromLng: params.from.longitude,
      toLat: params.to.latitude,
      toLng: params.to.longitude,
      mode: params.mode,
    },
    // Public endpoint: asking for directions before signing in is the normal
    // case, and a failed token refresh must not block it.
    withAuth: false,
  });
}

/**
 * The address at a point — what a dragged pin is standing on.
 *
 * The API answers 404 when there is nothing there, which `api.get` turns into
 * a thrown `ApiError`. Callers that treat "no address" as an ordinary outcome
 * rather than a failure should use `reverseGeocodeOrNull`.
 */
export function reverseGeocode(at: LatLng): Promise<Address> {
  return api.get<Address>('/geo/reverse', {
    query: { lat: at.latitude, lng: at.longitude },
    withAuth: false,
  });
}

/**
 * The same lookup, with "nothing is there" as a value rather than a throw.
 *
 * Dragging a pin into the river is an ordinary thing to do, and a form field
 * should go quiet rather than show an error for it. Only ADDRESS_NOT_FOUND is
 * swallowed — a rate limit or an unreachable provider still surfaces, because
 * those are worth telling someone about.
 */
export async function reverseGeocodeOrNull(at: LatLng): Promise<Address | null> {
  try {
    return await reverseGeocode(at);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'ADDRESS_NOT_FOUND') return null;
    throw error;
  }
}

/** Suggestions while typing. Deliberately carries no coordinates — see `resolveAddress`. */
export function suggestAddresses(params: {
  input: string;
  near?: LatLng;
  sessionToken?: string;
}): Promise<AddressSuggestion[]> {
  return api.get<AddressSuggestion[]>('/geo/autocomplete', {
    query: {
      input: params.input,
      ...nearQuery(params.near),
      ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
    },
    withAuth: false,
  });
}

/**
 * Exchanges a suggestion for the address it stands for, coordinates included.
 *
 * Passing the same `sessionToken` used for the suggestions is what lets the
 * provider bill the whole run as one lookup instead of one per keystroke.
 */
export function resolveAddress(params: {
  ref: string;
  sessionToken?: string;
}): Promise<Address> {
  return api.get<Address>('/geo/resolve', {
    query: {
      ref: params.ref,
      ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
    },
    withAuth: false,
  });
}

/** Ranked candidates for a complete written address. */
export function geocodeAddress(params: { address: string; near?: LatLng }): Promise<Address[]> {
  return api.get<Address[]>('/geo/forward', {
    query: { address: params.address, ...nearQuery(params.near) },
    withAuth: false,
  });
}
