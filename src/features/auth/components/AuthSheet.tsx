'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/errors';
import { useSessionStore } from '../store';
import { login, register } from '../api';

type Mode = 'signin' | 'register';

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
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="bg-ink/40 fixed inset-0 z-50 backdrop-blur-[2px]" />
        <Drawer.Content className="px-safe border-border bg-surface shadow-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border-t focus:outline-none">
          <div className="bg-border mx-auto mt-3 h-1 w-10 shrink-0 rounded-full" />
          {open && (
            <AuthForm
              reason={reason}
              onDone={() => {
                onOpenChange(false);
              }}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function AuthForm({ reason, onDone }: { reason?: string | undefined; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const setUser = useSessionStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const submit = useMutation({
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
        {isRegister ? 'Create your account' : 'Welcome back'}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {reason ?? 'Save places, write reviews, and get recommendations tuned to you.'}
      </Drawer.Description>

      {isRegister && (
        <label className="mt-4 block">
          <span className="text-ink text-sm font-semibold">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            autoComplete="name"
            className="bg-surface-sunken text-ink focus-visible:outline-primary mt-1.5 h-12 w-full rounded-md px-3.5 text-[0.9375rem] outline-none focus-visible:outline-2"
          />
        </label>
      )}

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">Email</span>
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
          className="bg-surface-sunken text-ink focus-visible:outline-primary mt-1.5 h-12 w-full rounded-md px-3.5 text-[0.9375rem] outline-none focus-visible:outline-2"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className="bg-surface-sunken text-ink focus-visible:outline-primary mt-1.5 h-12 w-full rounded-md px-3.5 text-[0.9375rem] outline-none focus-visible:outline-2"
        />
        {isRegister && (
          <span className="text-ink-subtle mt-1 block text-xs">At least 8 characters.</span>
        )}
      </label>

      {submit.error && (
        <p role="alert" className="bg-danger/10 text-danger mt-4 rounded-md p-3 text-sm">
          {submit.error instanceof ApiError
            ? submit.error.message
            : 'Something went wrong. Please try again.'}
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
        {isRegister ? 'Create account' : 'Sign in'}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(isRegister ? 'signin' : 'register');
          submit.reset();
        }}
        className="text-ink-muted mt-4 w-full pb-6 text-center text-sm"
      >
        {isRegister ? (
          <>
            Already have an account? <span className="text-primary font-medium">Sign in</span>
          </>
        ) : (
          <>
            New here? <span className="text-primary font-medium">Create an account</span>
          </>
        )}
      </button>
    </form>
  );
}
