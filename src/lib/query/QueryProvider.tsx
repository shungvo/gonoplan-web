'use client';

import { useState, type ReactNode } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { Toaster } from '@/components/ui/Toaster';
import { errorToast, showToast } from '@/components/ui/toast';

/**
 * Declared by a mutation that renders its own failure.
 *
 * The toast is the default because silence was: a mutation that did not put
 * `error` on screen somewhere simply failed, and the only trace was in the
 * network tab. Opting out is a claim that the user will see the problem
 * another way — a form field, a dialog that stays open — and it has to be
 * made deliberately.
 */
export interface MutationMeta {
  inlineError?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: MutationMeta;
  }
}

/**
 * TanStack Query is the *only* server-state cache in the app. Nothing that
 * comes from the API is mirrored into Zustand — one cache, one source of
 * truth, no synchronisation bugs. See docs/00-architecture.md §4.
 */
/** Exported so the toast rule can be tested against the real client. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    /*
     * One place where a failed write becomes visible.
     *
     * Per-mutation `onError` was the alternative, and the evidence against it
     * is the app as it stood: of thirty-odd mutations, three had one, and two
     * of those were cache rollbacks that showed the user nothing. Every
     * moderation decision in the admin queues failed silently. A default that
     * has to be remembered at every call site is not a default.
     */
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.inlineError) return;
        showToast(errorToast(error));
      },
    }),

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

  return (
    <QueryClientProvider client={queryClient}>
      {/* Inside the query provider: restoring a session invalidates every
          anonymous response, which needs the client to already exist. */}
      <SessionProvider>{children}</SessionProvider>
      {/* Once, above every route group. The phone shell and the admin shell
          both raise failures, and a toaster mounted per layout would miss
          whichever one the error came from. */}
      <Toaster />
    </QueryClientProvider>
  );
}
