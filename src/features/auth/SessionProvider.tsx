'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from './store';
import { restoreSession } from './api';

/**
 * Restores the session once, on load.
 *
 * The access token is held in memory only, so a refresh, a new tab or a
 * returning visitor all start signed out until the HttpOnly cookie is
 * exchanged. Doing that here — above the router — means every screen sees a
 * settled session rather than each one guessing.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const setUser = useSessionStore((state) => state.setUser);
  const setInitialized = useSessionStore((state) => state.setInitialized);
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => {
    // StrictMode mounts effects twice in development; refreshing twice would
    // present an already-rotated token and trip reuse detection.
    if (started.current) return;
    started.current = true;

    void restoreSession().then((user) => {
      if (user) {
        setUser(user);
        // Anything fetched anonymously before this resolved is missing
        // isSaved, hasVoted and canReview.
        void queryClient.invalidateQueries();
      } else {
        setInitialized();
      }
    });
  }, [setUser, setInitialized, queryClient]);

  return <>{children}</>;
}
