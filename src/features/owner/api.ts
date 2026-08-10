import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

export type OwnerProfile = components['schemas']['OwnerProfile'];
export type OwnerPlace = components['schemas']['OwnerPlace'];
export type OwnerReview = components['schemas']['OwnerReview'];
export type OwnerDashboard = components['schemas']['OwnerDashboard'];
export type PlaceAnalytics = components['schemas']['PlaceAnalytics'];

export function registerBusiness(input: {
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
}): Promise<OwnerProfile> {
  return api.post<OwnerProfile>('/owner/register', input);
}

export function updateBusiness(input: {
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
}): Promise<OwnerProfile> {
  return api.patch<OwnerProfile>('/owner/profile', input);
}

export function fetchDashboard(): Promise<OwnerDashboard> {
  return api.get<OwnerDashboard>('/owner/dashboard');
}

export function fetchOwnerPlaces(): Promise<OwnerPlace[]> {
  return api.get<OwnerPlace[]>('/owner/places');
}

export function fetchOwnerReviews(unanswered: boolean): Promise<OwnerReview[]> {
  return api.get<OwnerReview[]>('/owner/reviews', { query: { unanswered } });
}

export function fetchPlaceAnalytics(placeId: string, days = 30): Promise<PlaceAnalytics> {
  return api.get<PlaceAnalytics>(`/owner/places/${placeId}/analytics`, { query: { days } });
}

export function replyToReview(reviewId: string, content: string): Promise<{ replied: true }> {
  return api.post<{ replied: true }>(`/reviews/${reviewId}/reply`, { content });
}
