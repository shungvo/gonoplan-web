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
import { en } from '@/i18n/messages/en';
import type { MessageKey } from '@/i18n/messages/keys';
import { useErrorMessage } from '@/i18n/useErrorMessage';

type Reason =
  | 'CLOSED_PERMANENTLY'
  | 'INCORRECT_INFO'
  | 'DUPLICATE'
  | 'SPAM'
  | 'INAPPROPRIATE'
  | 'OFFENSIVE'
  | 'OTHER';

export type ReportTargetType = 'PLACE' | 'REVIEW' | 'USER';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  /** Shown under the title, so the reporter can see what they are reporting. */
  label: string;
}

/**
 * A different list per target, because a reason a moderator cannot act on is
 * worse than one fewer option.
 *
 * "Permanently closed" is meaningless about a person, and "offensive" was
 * missing entirely until reviews and profiles became reportable — the enum has
 * carried OFFENSIVE since the first migration and nothing could ever send it.
 */
const REASONS: Record<ReportTargetType, Reason[]> = {
  PLACE: ['CLOSED_PERMANENTLY', 'INCORRECT_INFO', 'DUPLICATE', 'SPAM', 'INAPPROPRIATE', 'OTHER'],
  REVIEW: ['OFFENSIVE', 'INAPPROPRIATE', 'SPAM', 'OTHER'],
  USER: ['OFFENSIVE', 'SPAM', 'INAPPROPRIATE', 'OTHER'],
};

const TITLE_KEY: Record<ReportTargetType, MessageKey> = {
  PLACE: 'report.title',
  REVIEW: 'report.reviewTitle',
  USER: 'report.profileTitle',
};

/**
 * A review's wording differs from a place's for the same enum value: "not
 * about the place" is a review problem and nonsense about a listing.
 */
function reasonKeys(type: ReportTargetType, reason: Reason): [MessageKey, MessageKey] {
  const scoped = `report.${reason}.review` as MessageKey;
  if (type === 'REVIEW' && scoped in en) {
    return [scoped, `report.${reason}.review.hint` as MessageKey];
  }
  return [`report.${reason}` as MessageKey, `report.${reason}.hint` as MessageKey];
}

const MAX_DESCRIPTION = 1000;

interface Result {
  id: string;
  alreadyReported: boolean;
}

export function ReportSheet({
  target,
  open,
  onOpenChange,
}: {
  target: ReportTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {/* Keyed on the target so the form never opens carrying the previous
          report's selection. */}
      {open && (
        <ReportForm
          key={`${target.type}:${target.id}`}
          target={target}
          onDone={() => {
            onOpenChange(false);
          }}
        />
      )}
    </BottomSheet>
  );
}

function ReportForm({ target, onDone }: { target: ReportTarget; onDone: () => void }) {
  const t = useT();
  const describeError = useErrorMessage();
  const [reason, setReason] = useState<Reason | null>(null);
  const [description, setDescription] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api.post<Result>('/reports', {
        targetType: target.type,
        targetId: target.id,
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
            ? t(`report.alreadyBody.${target.type}`)
            : t(`report.thanksBody.${target.type}`)}
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
        {t(TITLE_KEY[target.type])}
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {target.label}
      </Drawer.Description>

      <fieldset className="mt-4">
        <legend className="sr-only">{t('report.reason')}</legend>
        <div className="space-y-2">
          {REASONS[target.type].map((option) => (
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
                  {t(reasonKeys(target.type, option)[0])}
                </span>
                <span className="text-ink-subtle block text-xs">
                  {t(reasonKeys(target.type, option)[1])}
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
