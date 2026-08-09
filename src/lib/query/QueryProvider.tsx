'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

/**
 * TanStack Query is the *only* server-state cache in the app. Nothing that
 * comes from the API is mirrored into Zustand — one cache, one source of
 * truth, no synchronisation bugs. See docs/00-architecture.md §4.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Discovery data is location-scoped and changes slowly. A minute of
        // staleness avoids refetching the same nearby places every time the
        // user returns to the home tab.
        staleTime: 60_000,
        gcTime: 30 * 60_000,

        // On mobile, tab focus fires constantly as users switch apps.
        // Refetching each time burns battery and metered data for nothing.
        refetchOnWindowFocus: false,
        // Reconnect is different: it means we were offline, so data may
        // genuinely be stale.
        refetchOnReconnect: true,

        retry: (failureCount, error) => {
          // Retrying a 404 or a 403 just delays the error state.
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
      },
      mutations: {
        // Writes are not idempotent — a retried review post creates two.
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState, not a module-level client: on the server a shared client would
  // leak one user's cached data into another user's request.
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
