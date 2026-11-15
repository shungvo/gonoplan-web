'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, KeyRound, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { ApiError } from '@/lib/api/errors';
import { useSessionStore } from '../store';
import { resetPassword } from '../api';
import { AuthSheet } from './AuthSheet';
import { PasswordField } from './PasswordField';

/**
 * Where a reset email lands: choose a new password.
 *
 * Asked for twice. The field can be shown, but on a phone keyboard at the end
 * of a frustrating morning the second entry is what catches the typo that
 * would otherwise lock somebody out a second time with a password they never
 * actually typed.
 *
 * Success does not sign anyone in. It ends every session on the account —
 * that is the point of a reset — and then asks for the new password once, on
 * the screen where getting it wrong is easy to recover from.
 */
export function ResetPasswordScreen({ token }: { token: string | null }) {
  const t = useT();
  const describeError = useErrorMessage();
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clear);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const reset = useMutation({
    meta: { inlineError: true },
    mutationFn: () => resetPassword(token ?? '', password),
    onSuccess: () => {
      // Every session on the account just ended, this one included. Anything
      // cached was fetched as that session.
      clearSession();
      queryClient.clear();
    },
  });

  const linkIsDead =
    token === null ||
    (reset.error instanceof ApiError &&
      (reset.error.code === 'AUTH_LINK_INVALID' ||
        // A token that fails the shape check: a mail client wrapped the URL.
        (reset.error.code === 'VALIDATION_FAILED' && password.length >= 8)));

  if (linkIsDead) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <EmptyState
          icon={<Link2Off className="size-7" aria-hidden />}
          title={t('reset.deadTitle')}
          description={t('reset.deadBody')}
          action={
            <Button
              onClick={() => {
                setSigningIn(true);
              }}
            >
              {t('reset.askAgain')}
            </Button>
          }
        />
        <AuthSheet open={signingIn} onOpenChange={setSigningIn} />
      </main>
    );
  }

  if (reset.isSuccess) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <EmptyState
          icon={<CircleCheck className="size-7" aria-hidden />}
          title={t('reset.doneTitle')}
          description={t('reset.doneBody')}
          action={
            <Button
              onClick={() => {
                setSigningIn(true);
              }}
            >
              {t('common.signIn')}
            </Button>
          }
        />
        <AuthSheet open={signingIn} onOpenChange={setSigningIn} />
      </main>
    );
  }

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password;

  return (
    <main className="pt-safe-float px-safe min-h-dvh">
      <form
        className="mx-auto max-w-md px-5 pt-10 pb-10"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) reset.mutate();
        }}
      >
        <div className="bg-primary-tint text-primary flex size-14 items-center justify-center rounded-xl">
          <KeyRound className="size-7" aria-hidden />
        </div>
        <h1 className="text-ink mt-5 text-2xl font-bold tracking-tight">{t('reset.title')}</h1>
        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{t('reset.body')}</p>

        <PasswordField
          label={t('reset.newPassword')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={tooShort ? undefined : t('auth.passwordHint')}
          autoFocus
        />
        {tooShort && (
          <p className="text-danger mt-1 text-xs" role="status">
            {t('auth.passwordHint')}
          </p>
        )}

        <PasswordField
          label={t('reset.confirmPassword')}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {mismatch && (
          <p className="text-danger mt-1 text-xs" role="status">
            {t('reset.mismatch')}
          </p>
        )}

        {reset.error != null && (
          <p role="alert" className="bg-danger/10 text-danger mt-4 rounded-md p-3 text-sm">
            {describeError(reset.error)}
          </p>
        )}

        <p className="text-ink-subtle mt-5 text-xs leading-relaxed">{t('reset.signOutNotice')}</p>

        <Button
          type="submit"
          fullWidth
          size="lg"
          className="mt-3"
          disabled={!canSubmit}
          isLoading={reset.isPending}
        >
          {t('reset.submit')}
        </Button>

        <Link href="/" className="text-ink-muted mt-2 flex min-h-11 items-center justify-center text-sm">
          {t('shared.openApp')}
        </Link>
      </form>
    </main>
  );
}
