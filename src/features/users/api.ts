import { api } from '@/lib/api/client';
import type { components } from '@/types/api';

export type PublicUser = components['schemas']['PublicUser'];

/**
 * Someone's public profile.
 *
 * `withAuth: false` because a profile is a public page: a shared link has to
 * work for somebody who has not signed in, and sending a token would only
 * change what gets logged, never what comes back.
 */
export function fetchPublicUser(id: string): Promise<PublicUser> {
  return api.get<PublicUser>(`/users/${id}`, { withAuth: false });
}
