import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

export type CheckIn = components['schemas']['CheckIn'];
export type CheckInImage = components['schemas']['CheckInImage'];
export type CheckInPage = components['schemas']['CheckInPage'];

export interface CreateCheckInInput {
  placeId: string;
  caption?: string;
  /** `YYYY-MM-DD`. Omitted means today, decided by the server. */
  visitedAt?: string;
  imageKeys: string[];
}

/**
 * One of `userId` or `placeId` is required by the API.
 *
 * Typed as a union rather than two optional fields, so "I forgot to pass
 * either" is a compile error here instead of a 400 at runtime.
 */
export type CheckInFilter = { userId: string } | { placeId: string };

export function fetchCheckIns(
  filter: CheckInFilter,
  options: { cursor?: string; limit?: number } = {},
): Promise<CheckInPage> {
  return api.get<CheckInPage>('/checkins', {
    query: {
      ...filter,
      ...(options.cursor ? { cursor: options.cursor } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    },
    // Public content: a signed-out visitor looking at somebody's profile still
    // sees their photographs. The token is sent when there is one, because
    // `canDelete` depends on who is asking.
    withAuth: 'optional',
  });
}

export function createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
  return api.post<CheckIn>('/checkins', input);
}

export function deleteCheckIn(id: string): Promise<{ id: string }> {
  return api.delete<{ id: string }>(`/checkins/${id}`);
}
