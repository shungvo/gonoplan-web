'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/field';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { useSessionStore } from '../store';
import { forgotPassword, login, register } from '../api';
import { PasswordField } from './PasswordField';

type Mode = 'signin' | 'register' | 'forgot';

export function AuthSheet({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Why the sheet appeared, e.g. "Sign in to save places". */
  reason?: string | undefined;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
          {open && (
            <AuthForm
              reason={reason}
              onDone={() => {
                onOpenChange(false);
              }}
            />
          )}
    </BottomSheet>
  );
}

function AuthForm({ reason, onDone }: { reason?: string | undefined; onDone: () => void }) {
  const t = useT();
  const describeError = useErrorMessage();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const setUser = useSessionStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const submit = useMutation({
    // Rendered under the form, where the field that caused it is.
    meta: { inlineError: true },
    mutationFn: () =>
      mode === 'signin' ? login({ email, password }) : register({ email, password, name }),
    onSuccess: (user) => {
      setUser(user);
      // Every cached response was fetched anonymously and is missing isSaved,
      // hasVoted and canReview.
      void queryClient.invalidateQueries();
      onDone();
    },
  });

  if (mode === 'forgot') {
    return (
      <ForgotPasswordForm
        initialEmail={email}
        onBack={(typed) => {
          // The address carries back, so somebody who remembered the
          // password on the way does not type their email twice.
          setEmail(typed);
          setMode('signin');
        }}
      />
    );
  }

  const isRegister = mode === 'register';
  const canSubmit =
    email.trim().length > 3 && password.length >= (isRegister ? 8 : 1) && (!isRegister || name.trim().length > 0);

  return (
    <form
      className="pb-safe overflow-y-auto px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) submit.mutate();
      }}
    >
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {isRegister ? t('auth.createTitle') : t('auth.welcomeBack')}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {reason ?? t('auth.pitch')}
      </Drawer.Description>

      {isRegister && (
        <label className="mt-4 block">
          <span className="text-ink text-sm font-semibold">{t('auth.name')}</span>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            autoComplete="name"
            className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
          />
        </label>
      )}

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">{t('auth.email')}</span>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          autoComplete="email"
          // `email` keyboard and no autocapitalise: a capitalised first letter
          // is the single most common cause of a "wrong password" on mobile.
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
        />
      </label>

      <PasswordField
        label={t('auth.password')}
        value={password}
        onChange={setPassword}
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        hint={isRegister ? t('auth.passwordHint') : undefined}
      />

      {/*
        Under the field it is about, where somebody who has just been told
        their password is wrong is already looking. It had nowhere to go
        before: a forgotten password meant a new account.
      */}
      {!isRegister && (
        <button
          type="button"
          onClick={() => {
            setMode('forgot');
            submit.reset();
          }}
          className="text-primary mt-2 -ml-1 flex h-11 items-center px-1 text-sm font-medium"
        >
          {t('auth.forgotLink')}
        </button>
      )}

      {/* Through the code catalogue rather than the server's prose, which is
          English and was shown as-is to everybody. */}
      {submit.error && (
        <p role="alert" className="bg-danger/10 text-danger mt-4 rounded-md p-3 text-sm">
          {describeError(submit.error)}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        className="mt-5"
        disabled={!canSubmit}
        isLoading={submit.isPending}
      >
        {isRegister ? t('auth.createAccount') : t('common.signIn')}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(isRegister ? 'signin' : 'register');
          submit.reset();
        }}
        className="text-ink-muted mt-2 min-h-11 w-full pb-6 text-center text-sm"
      >
        {isRegister ? (
          <>
            {t('auth.haveAccount')}{' '}
            <span className="text-primary font-medium underline underline-offset-4">{t('common.signIn')}</span>
          </>
        ) : (
          <>
            {t('auth.newHere')}{' '}
            <span className="text-primary font-medium underline underline-offset-4">{t('auth.createOne')}</span>
          </>
        )}
      </button>
    </form>
  );
}

/**
 * "I forgot", inside the same sheet.
 *
 * The confirmation says what the server can honestly say: a link is on its
 * way *if* the address has an account. Not "check your inbox" — that would
 * tell anyone who types an address whether it is registered here, which is
 * the one thing the API takes care not to reveal.
 */
function ForgotPasswordForm({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: (email: string) => void;
}) {
  const t = useT();
  const describeError = useErrorMessage();
  const [email, setEmail] = useState(initialEmail);

  const send = useMutation({
    meta: { inlineError: true },
    mutationFn: () => forgotPassword(email.trim()),
  });

  if (send.isSuccess) {
    return (
      <div className="pb-safe overflow-y-auto px-5 pt-4">
        <div className="bg-primary-tint text-primary flex size-14 items-center justify-center rounded-xl">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <Drawer.Title className="text-ink mt-4 text-xl font-semibold tracking-tight">
          {t('auth.forgotSentTitle')}
        </Drawer.Title>
        <Drawer.Description className="text-ink-muted mt-1.5 text-sm leading-relaxed">
          {t('auth.forgotSentBody', { email: email.trim() })}
        </Drawer.Description>
        <p className="text-ink-subtle mt-3 text-sm leading-relaxed">{t('auth.forgotSentHint')}</p>

        <Button
          fullWidth
          size="lg"
          className="mt-6"
          onClick={() => {
            onBack(email.trim());
          }}
        >
          {t('auth.backToSignIn')}
        </Button>
        <button
          type="button"
          onClick={() => {
            send.reset();
          }}
          className="text-ink-muted mt-2 min-h-11 w-full pb-6 text-center text-sm"
        >
          {t('auth.forgotDifferentEmail')}
        </button>
      </div>
    );
  }

  const canSubmit = email.trim().length > 3;

  return (
    <form
      className="pb-safe overflow-y-auto px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) send.mutate();
      }}
    >
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('auth.forgotTitle')}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {t('auth.forgotBody')}
      </Drawer.Description>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">{t('auth.email')}</span>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          autoFocus
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
        />
      </label>

      {send.error && (
        <p role="alert" className="bg-danger/10 text-danger mt-4 rounded-md p-3 text-sm">
          {describeError(send.error)}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        className="mt-5"
        disabled={!canSubmit}
        isLoading={send.isPending}
      >
        {t('auth.forgotSend')}
      </Button>

      <button
        type="button"
        onClick={() => {
          onBack(email);
        }}
        className="text-ink-muted mt-2 min-h-11 w-full pb-6 text-center text-sm"
      >
        {t('auth.backToSignIn')}
      </button>
    </form>
  );
}
