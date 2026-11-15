'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Link2Off, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';
import { useSessionStore } from '../store';
import { verifyEmail } from '../api';

/**
 * Where a verification email lands.
 *
 * It confirms on arrival rather than asking for a tap. The person already
 * tapped — in their mail app — and a second button that says "yes, really"
 * is a step nobody would miss. The page still POSTs rather than the link
 * doing the work as a GET, so a mail scanner that fetches every URL in a
 * message cannot verify an address on its own.
 *
 * A query rather than a mutation fired from an effect. The mutation version
 * stayed on its spinner forever in development: React mounts twice there, the
 * request went out from the first mount, and its result never reached the
 * second. Following a link twice is defined to succeed, so a query — which
 * survives remounting and dedupes the request — is the honest shape for it.
 */
export function VerifyEmailScreen({ token }: { token: string | null }) {
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);

  const verify = useQuery({
    queryKey: ['verify-email', token],
    queryFn: async () => {
      await verifyEmail(token ?? '');
      return true;
    },
    enabled: token !== null,
    // Once per visit. A dead link is dead, and refetching on focus would
    // re-send a one-time secret for no reason.
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /*
   * If this device is signed in to the account, stop showing it the reminder
   * without waiting for its next refresh. The id is not checked: the token
   * decides which account was verified, and a stale flag here is harmless and
   * corrected on the next load. An effect because the session may still be
   * restoring when the answer arrives.
   */
  useEffect(() => {
    if (verify.isSuccess && user && !user.emailVerified) {
      setUser({ ...user, emailVerified: true });
    }
  }, [verify.isSuccess, user, setUser]);

  if (token !== null && verify.isPending) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-5">
        <Loader2 className="text-ink-subtle size-6 animate-spin" aria-hidden />
        <p className="text-ink-muted text-sm" role="status">
          {t('verify.working')}
        </p>
      </main>
    );
  }

  if (verify.isSuccess) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <EmptyState
          icon={<CircleCheck className="size-7" aria-hidden />}
          title={t('verify.doneTitle')}
          description={t('verify.doneBody')}
          action={
            <Link href="/">
              <Button>{t('shared.openApp')}</Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <EmptyState
        icon={<Link2Off className="size-7" aria-hidden />}
        title={t('verify.deadTitle')}
        description={t('verify.deadBody')}
        action={
          <Link href="/profile">
            <Button variant="secondary">{t('verify.goToProfile')}</Button>
          </Link>
        }
      />
    </main>
  );
}
