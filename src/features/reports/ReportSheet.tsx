'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { fieldClass } from '@/components/ui/field';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';

type Reason = 'CLOSED_PERMANENTLY' | 'INCORRECT_INFO' | 'DUPLICATE' | 'SPAM' | 'INAPPROPRIATE' | 'OTHER';

/**
 * Only the reasons that make sense for a place.
 *
 * OFFENSIVE is deliberately absent — it belongs to reviews and accounts, and
 * offering it here produces reports a moderator cannot act on.
 */
const REASONS: Reason[] = [
  'CLOSED_PERMANENTLY',
  'INCORRECT_INFO',
  'DUPLICATE',
  'SPAM',
  'INAPPROPRIATE',
  'OTHER',
];

const MAX_DESCRIPTION = 1000;

interface Result {
  id: string;
  alreadyReported: boolean;
}

export function ReportSheet({
  placeId,
  placeName,
  open,
  onOpenChange,
}: {
  placeId: string;
  placeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
          {/* Keyed on the place so the form never opens carrying the previous
              report's selection. */}
          {open && (
            <ReportForm
              key={placeId}
              placeId={placeId}
              placeName={placeName}
              onDone={() => {
                onOpenChange(false);
              }}
            />
          )}
    </BottomSheet>
  );
}

function ReportForm({
  placeId,
  placeName,
  onDone,
}: {
  placeId: string;
  placeName: string;
  onDone: () => void;
}) {
  const t = useT();
  const describeError = useErrorMessage();
  const [reason, setReason] = useState<Reason | null>(null);
  const [description, setDescription] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api.post<Result>('/reports', {
        targetType: 'PLACE',
        targetId: placeId,
        reason,
        ...(description.trim() ? { description: description.trim() } : {}),
      }),
  });

  // Mirrors the server's refinement: "Other" with no explanation is a report
  // nobody can act on without contacting the reporter.
  const needsDescription = reason === 'OTHER' && description.trim().length < 10;

  if (submit.isSuccess) {
    return (
      <div className="pb-safe px-5 pt-6 text-center">
        <span className="bg-success/10 text-success mx-auto flex size-12 items-center justify-center rounded-full">
          <Check className="size-6" aria-hidden />
        </span>
        <Drawer.Title className="text-ink mt-3 text-lg font-semibold tracking-tight">
          {submit.data.alreadyReported ? t('report.alreadyTitle') : t('report.thanksTitle')}
        </Drawer.Title>
        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
          {submit.data.alreadyReported
            ? t('report.alreadyBody')
            : t('report.thanksBody')}
        </p>
        <Button fullWidth size="lg" className="mt-5 mb-4" onClick={onDone}>
          {t('common.done')}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="pb-safe overflow-y-auto px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (reason && !needsDescription) submit.mutate();
      }}
    >
      <Drawer.Title className="text-ink text-xl font-semibold tracking-tight">
        {t('report.title')}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {placeName}
      </Drawer.Description>

      <fieldset className="mt-4">
        <legend className="sr-only">{t('report.reason')}</legend>
        <div className="space-y-2">
          {REASONS.map((option) => (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md p-3 transition-colors',
                reason === option ? 'bg-primary-tint' : 'bg-surface-sunken',
              )}
            >
              <input
                type="radio"
                name="reason"
                value={option}
                checked={reason === option}
                onChange={() => {
                  setReason(option);
                }}
                className="accent-primary mt-0.5 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    reason === option ? 'text-primary' : 'text-ink',
                  )}
                >
                  {t(`report.${option}`)}
                </span>
                <span className="text-ink-subtle block text-xs">
                  {t(`report.${option}.hint`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">
          {t('report.details')}{' '}
          <span className="text-ink-subtle font-normal">
            {reason === 'OTHER' ? t('report.required') : t('common.optional')}
          </span>
        </span>
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value.slice(0, MAX_DESCRIPTION));
          }}
          rows={3}
          placeholder={t('report.detailsPlaceholder')}
          className={fieldClass('mt-1.5 resize-none p-3.5 text-[0.9375rem] leading-relaxed')}
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
        disabled={reason === null || needsDescription}
        isLoading={submit.isPending}
      >
        {t('report.send')}
      </Button>

      <p className="text-ink-subtle mt-3 pb-4 text-center text-xs">
        {t('report.privacy')}
      </p>
    </form>
  );
}
