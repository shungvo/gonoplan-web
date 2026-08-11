'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useSessionStore } from '@/features/auth/store';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from './config';

/**
 * Changes the language.
 *
 * Three things, in order of who needs them. The cookie is what the server
 * reads on the next request, so it has to be written before the refresh. The
 * refresh is what re-renders Server Components in the new language — without a
 * locale in the URL there is nothing to navigate to, so this is the whole
 * mechanism. And `PATCH /me` records it on the account, so signing in on a
 * second device carries the choice across.
 *
 * The account write is deliberately last and deliberately unawaited-on-failure:
 * somebody switching to English while offline should still get English.
 */
export function useSetLocale(): {
  setLocale: (locale: Locale) => void;
  isPending: boolean;
} {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { user, setUser } = useSessionStore();

  const setLocale = (locale: Locale) => {
    // Not HttpOnly: this is a display preference the client both writes and
    // reads, and there is nothing in it worth protecting from script that
    // could not simply be read off the page.
    document.cookie = [
      `${LOCALE_COOKIE}=${locale}`,
      'path=/',
      `max-age=${String(LOCALE_COOKIE_MAX_AGE)}`,
      'samesite=lax',
    ].join('; ');

    if (user) {
      // Optimistic, because the switch has already visibly happened. A failed
      // write means the next device does not inherit the choice, which is not
      // worth an error state on a language toggle.
      setUser({ ...user, locale });
      void api.patch('/me', { locale }).catch(() => undefined);
    }

    startTransition(() => {
      router.refresh();
    });
  };

  return { setLocale, isPending };
}
