'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/errors';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import { fieldClass } from '@/components/ui/field';

type Reason = 'CLOSED_PERMANENTLY' | 'INCORRECT_INFO' | 'DUPLICATE' | 'SPAM' | 'INAPPROPRIATE' | 'OTHER';

/**
 * Only the reasons that make sense for a place.
 *
 * OFFENSIVE is deliberately absent — it belongs to reviews and accounts, and
 * offering it here produces reports a moderator cannot act on.
 */
const REASONS: Array<{ value: Reason; label: string; hint: string }> = [
  { value: 'CLOSED_PERMANENTLY', label: 'Permanently closed', hint: 'It has shut down for good' },
  { value: 'INCORRECT_INFO', label: 'Wrong information', hint: 'Address, hours or phone are wrong' },
  { value: 'DUPLICATE', label: 'Duplicate listing', hint: 'This place is already on Gonoplan' },
  { value: 'SPAM', label: 'Spam or fake', hint: 'It is advertising, or does not exist' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate', hint: 'Offensive content or images' },
  { value: 'OTHER', label: 'Something else', hint: 'Tell us what is wrong' },
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
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="bg-ink/40 fixed inset-0 z-50 backdrop-blur-[2px]" />
        <Drawer.Content className="px-safe border-border bg-surface shadow-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border-t focus:outline-none">
          <div className="bg-border mx-auto mt-3 h-1 w-10 shrink-0 rounded-full" />
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
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
          {submit.data.alreadyReported ? 'Already with our team' : 'Thanks for telling us'}
        </Drawer.Title>
        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
          {submit.data.alreadyReported
            ? 'You have already reported this place and we are still looking at it.'
            : 'Someone will review this listing. We do not share who reported it.'}
        </p>
        <Button fullWidth size="lg" className="mt-5 mb-4" onClick={onDone}>
          Done
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
        Report this place
      </Drawer.Title>
      <Drawer.Description className="text-ink-muted mt-1 text-sm">
        {placeName}
      </Drawer.Description>

      <fieldset className="mt-4">
        <legend className="sr-only">Reason</legend>
        <div className="space-y-2">
          {REASONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md p-3 transition-colors',
                reason === option.value ? 'bg-primary-tint' : 'bg-surface-sunken',
              )}
            >
              <input
                type="radio"
                name="reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => {
                  setReason(option.value);
                }}
                className="accent-primary mt-0.5 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    reason === option.value ? 'text-primary' : 'text-ink',
                  )}
                >
                  {option.label}
                </span>
                <span className="text-ink-subtle block text-xs">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="text-ink text-sm font-semibold">
          Details{' '}
          <span className="text-ink-subtle font-normal">
            {reason === 'OTHER' ? '(required)' : '(optional)'}
          </span>
        </span>
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value.slice(0, MAX_DESCRIPTION));
          }}
          rows={3}
          placeholder="What did you see? Anything specific helps."
          className={fieldClass('mt-1.5 resize-none p-3.5 text-[0.9375rem] leading-relaxed')}
        />
      </label>

      {submit.error && (
        <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
          {submit.error instanceof ApiError
            ? submit.error.message
            : 'Could not send your report. Try again in a moment.'}
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
        Send report
      </Button>

      <p className="text-ink-subtle mt-3 pb-4 text-center text-xs">
        Your name is never shown publicly. Only moderators see who reported a place.
      </p>
    </form>
  );
}
