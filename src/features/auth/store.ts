'use client';

import { create } from 'zustand';

import type { components } from '@/types/api';

export type Role = 'USER' | 'PLACE_OWNER' | 'ADMIN';

/**
 * Taken from the generated contract rather than re-declared.
 *
 * A hand-written copy drifted the moment the API added `ownerStatus` — the
 * field existed on the wire and in the OpenAPI document, but the app could not
 * see it.
 */
export type SessionUser = components['schemas']['SessionUser'];

interface SessionState {
  user: SessionUser | null;
  /** True until the first refresh attempt settles, so guards don't flash. */
  isInitializing: boolean;

  setUser: (user: SessionUser | null) => void;
  setInitialized: () => void;
  clear: () => void;
}

/**
 * Session identity only — deliberately NOT persisted.
 *
 * The access token lives in a module closure in `lib/api/client.ts`, and the
 * refresh token is an HttpOnly cookie the JavaScript cannot see. Persisting
 * either the user or the token to localStorage would hand an XSS payload a
 * working session. On reload, the client refreshes from the cookie and
 * repopulates this store.
 */
export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  isInitializing: true,

  setUser: (user) => {
    set({ user, isInitializing: false });
  },
  setInitialized: () => {
    set({ isInitializing: false });
  },
  clear: () => {
    set({ user: null, isInitializing: false });
  },
}));

export function useCurrentUser(): SessionUser | null {
  return useSessionStore((state) => state.user);
}

export function useIsAuthenticated(): boolean {
  return useSessionStore((state) => state.user !== null);
}
