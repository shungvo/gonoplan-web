import { api, setAccessToken } from '@/lib/api/client';
import type { components } from '@/types/api';
import type { SessionUser } from './store';

export type AuthResult = components['schemas']['AuthResult'];

function adopt(result: AuthResult): SessionUser {
  // The access token lives in a module closure, never localStorage — an XSS
  // payload can read storage but not a closure (docs/02-api.md §2).
  setAccessToken(result.accessToken);
  return result.user as SessionUser;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<SessionUser> {
  return adopt(await api.post<AuthResult>('/auth/register', input, { withAuth: false }));
}

export async function login(input: { email: string; password: string }): Promise<SessionUser> {
  return adopt(await api.post<AuthResult>('/auth/login', input, { withAuth: false }));
}

/**
 * Restores a session from the HttpOnly refresh cookie.
 *
 * Called once on load. The access token is deliberately not persisted, so
 * every page load starts signed out until this resolves — the cookie is the
 * only durable part of the session, and JavaScript cannot read it.
 *
 * Returns null rather than throwing: no session is the normal state for a
 * first-time visitor, not an error.
 */
export async function restoreSession(): Promise<SessionUser | null> {
  try {
    return adopt(await api.post<AuthResult>('/auth/refresh', undefined, { withAuth: false }));
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', undefined, { withAuth: false });
  } finally {
    // Cleared even if the request fails — the user asked to be signed out, and
    // the local session must not survive that.
    setAccessToken(null);
  }
}
