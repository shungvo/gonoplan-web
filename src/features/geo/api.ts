import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

export type Route = components['schemas']['Route'];
export type TravelMode = Route['mode'];

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
