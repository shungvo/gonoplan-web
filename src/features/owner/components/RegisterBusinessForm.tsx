'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fieldClass } from '@/components/ui/field';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';
import { registerBusiness } from '../api';

/**
 * Business registration (§24).
 *
 * Deliberately short. Verification documents belong to the approval
 * conversation, not the sign-up form — asking for a tax record before someone
 * has seen the dashboard loses most of them. The admin queue can ask for more.
 */
export function RegisterBusinessForm({ onRegistered }: { onRegistered: () => void }) {
  const t = useT();
  const describeError = useErrorMessage();
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  const submit = useMutation({
    // Rendered under the form, where the field that caused it is.
    meta: { inlineError: true },
    mutationFn: () =>
      registerBusiness({
        businessName: businessName.trim(),
        ...(businessEmail.trim() ? { businessEmail: businessEmail.trim() } : {}),
        ...(businessPhone.trim() ? { businessPhone: businessPhone.trim() } : {}),
      }),
    onSuccess: onRegistered,
  });

  return (
    <form
      className="bg-surface rounded-lg p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (businessName.trim().length >= 2) submit.mutate();
      }}
    >
      <span className="bg-primary-tint text-primary flex size-12 items-center justify-center rounded-lg">
        <Store className="size-6" aria-hidden />
      </span>

      <h2 className="text-ink mt-3 text-lg font-semibold tracking-tight">
        {t('register.title')}
      </h2>
      <p className="text-ink-muted mt-1 text-sm leading-relaxed">
        {t('register.body')}
      </p>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">{t('register.name')}</span>
        <input
          type="text"
          value={businessName}
          placeholder={t('register.namePlaceholder')}
          onChange={(event) => {
            setBusinessName(event.target.value);
          }}
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-ink text-sm font-semibold">
          {t('register.email')}{' '}
          <span className="text-ink-subtle font-normal">{t('common.optional')}</span>
        </span>
        <input
          type="email"
          value={businessEmail}
          placeholder={t('register.emailPlaceholder')}
          onChange={(event) => {
            setBusinessEmail(event.target.value);
          }}
          autoCapitalize="none"
          inputMode="email"
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
        />
      </label>

      <label className="mt-3 block">
        <span className="text-ink text-sm font-semibold">
          {t('register.phone')}{' '}
          <span className="text-ink-subtle font-normal">{t('common.optional')}</span>
        </span>
        <input
          type="tel"
          value={businessPhone}
          placeholder={t('register.phonePlaceholder')}
          onChange={(event) => {
            setBusinessPhone(event.target.value);
          }}
          inputMode="tel"
          className={fieldClass('mt-1.5 h-12 px-3.5 text-md')}
        />
      </label>

      {submit.error && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {describeError(submit.error)}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        className="mt-4"
        disabled={businessName.trim().length < 2}
        isLoading={submit.isPending}
      >
        {t('register.submit')}
      </Button>
    </form>
  );
}
