import { api, setAccessToken } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { readStoredRefreshToken, storeRefreshToken } from '@/lib/auth/refreshTokenStore';
import type { components } from '@/types/api';
import type { SessionUser } from './store';

export type AuthResult = components['schemas']['AuthResult'];

async function adopt(result: AuthResult): Promise<SessionUser> {
  // The access token lives in a module closure, never localStorage — an XSS
  // payload can read storage but not a closure (docs/02-api.md §2).
  setAccessToken(result.accessToken);

  // Only ever present for the native shell, and only it has somewhere safe to
  // put this. On the web the field is absent and the call does nothing.
  if (result.refreshToken !== undefined) await storeRefreshToken(result.refreshToken);

  return result.user as SessionUser;
}

/**
 * The body `/auth/refresh` and `/auth/logout` expect.
 *
 * Native sends the token it stored. The web sends nothing and lets the browser
 * attach the cookie — a body of `undefined` rather than `{}` so the request
 * stays byte-identical to what it always sent.
 */
async function presentedSession(): Promise<{ refreshToken: string } | undefined> {
  const stored = await readStoredRefreshToken();
  return stored === null ? undefined : { refreshToken: stored };
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
 * Restores a session from whatever this build durably holds.
 *
 * Called once on load. The access token is deliberately not persisted, so
 * every launch starts signed out until this resolves. On the web the durable
 * part is the HttpOnly cookie, which JavaScript cannot read; in the app it is
 * the Keychain.
 *
 * Returns null rather than throwing: no session is the normal state for a
 * first-time visitor, not an error.
 */
export async function restoreSession(): Promise<SessionUser | null> {
  try {
    return await adopt(
      await api.post<AuthResult>('/auth/refresh', await presentedSession(), { withAuth: false }),
    );
  } catch (error) {
    setAccessToken(null);

    /*
     * Discard the stored token only when the server actually rejected it.
     *
     * Restoring runs at launch, which is exactly when a phone is most likely
     * to have no usable network yet. Clearing on any failure would turn a
     * cold start in a lift into a permanent sign-out, and the user would have
     * no idea why they had to log in again.
     */
    if (error instanceof ApiError && error.status === 401) await storeRefreshToken(null);

    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    // Sent so the server can revoke the session rather than leave it live
    // until it expires — the cookie path gets this for free.
    await api.post('/auth/logout', await presentedSession(), { withAuth: false });
  } finally {
    // Cleared even if the request fails — the user asked to be signed out, and
    // the local session must not survive that.
    setAccessToken(null);
    await storeRefreshToken(null);
  }
}

/**
 * Change something about the signed-in account.
 *
 * Partial on purpose: every field is optional server-side, so a caller that
 * only wants to swap the avatar sends one key rather than resubmitting a whole
 * profile it did not read. The response is the fresh session user, which is
 * what the store then holds — re-fetching `/auth/me` afterwards would be a
 * second round trip for a body the first one already returned.
 */
export function updateProfile(input: {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  locale?: 'vi' | 'en';
}): Promise<SessionUser> {
  return api.patch<SessionUser>('/auth/me', input);
}
