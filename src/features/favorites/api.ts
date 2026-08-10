import { api, type ApiResult } from '@/lib/api/client';
import type { Coordinates } from '@/lib/geo/grid';
import type { PlaceCard } from '@/features/places/api';

export interface SaveResult {
  isSaved: boolean;
  saveCount: number;
}

export function savePlace(placeId: string): Promise<SaveResult> {
  return api.post<SaveResult>(`/places/${placeId}/favorite`);
}

export function unsavePlace(placeId: string): Promise<SaveResult> {
  return api.delete<SaveResult>(`/places/${placeId}/favorite`);
}

export function fetchSavedPlaces(origin?: Coordinates | null): Promise<ApiResult<PlaceCard[]>> {
  return api.getWithMeta<PlaceCard[]>('/favorites', {
    query: origin ? { lat: origin.latitude, lng: origin.longitude } : {},
  });
}
