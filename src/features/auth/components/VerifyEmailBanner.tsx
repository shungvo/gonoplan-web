'use client';

import { useMutation } from '@tanstack/react-query';
import { MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { useSessionStore } from '../store';
import { sendVerificationEmail } from '../api';

/**
 * A reminder, on the profile, until the address is proven.
 *
 * Here and nowhere else. Nothing in the app is locked behind verification —
 * the only thing it buys is a way back in when a password is forgotten — so a
 * banner over the home feed would be nagging about something that costs
 * nothing today. The profile is where somebody goes to look at their account,
 * which is where this belongs.
 *
 * Says why in one line, because "verify your email" with no reason reads as
 * the app wanting something rather than offering it.
 */
export function VerifyEmailBanner() {
  const t = useT();
  const describeError = useErrorMessage();
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);

  const send = useMutation({
    meta: { inlineError: true },
    mutationFn: sendVerificationEmail,
    onSuccess: (result) => {
      // Verified on another device since this session began.
      if (result.alreadyVerified && user) setUser({ ...user, emailVerified: true });
    },
  });

  if (!user || user.emailVerified) return null;

  const status = send.data
    ? send.data.sent
      ? t('verifyBanner.sent', { email: user.email })
      : t('verifyBanner.recent')
    : null;

  return (
    <section
      aria-label={t('verifyBanner.title')}
      className="border-warning/25 bg-warning/8 mt-4 rounded-lg border p-4"
    >
      <h2 className="text-ink flex items-center gap-2 text-sm font-semibold">
        <MailWarning className="text-warning size-4 shrink-0" aria-hidden />
        {t('verifyBanner.title')}
      </h2>
      <p className="text-ink-muted mt-1 text-sm leading-relaxed">
        {t('verifyBanner.body', { email: user.email })}
      </p>

      {status && (
        <p className="text-ink mt-2 text-sm font-medium" role="status">
          {status}
        </p>
      )}
      {send.error != null && (
        <p className="text-danger mt-2 text-sm" role="alert">
          {describeError(send.error)}
        </p>
      )}

      {/* Hidden once something was sent, so a second tap is not the obvious
          next move; the minute-long cooldown would only refuse it anyway. */}
      {!send.data?.sent && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          isLoading={send.isPending}
          onClick={() => {
            send.mutate();
          }}
        >
          {t('verifyBanner.send')}
        </Button>
      )}
    </section>
  );
}
