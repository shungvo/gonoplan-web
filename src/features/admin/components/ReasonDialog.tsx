'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { useErrorMessage } from '@/i18n/useErrorMessage';

export interface ReasonDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Negative actions demand a reason; approvals do not. */
  requireReason?: boolean;
  /** Defaults to the generic explanation prompt. */
  placeholder?: string | undefined;
  destructive?: boolean;
  isPending?: boolean;
  error?: unknown;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Mirrors the server's `moderationReasonSchema`, so the button matches the API. */
const MIN_REASON = 4;
const MAX_REASON = 500;

/**
 * Confirmation dialog for a moderation decision.
 *
 * Built on the native `<dialog>` element rather than a div with a z-index:
 * focus trapping, Escape-to-close, inertness of the page behind it and the top
 * layer all come for free, and every one of them is something a hand-rolled
 * modal gets subtly wrong.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  requireReason = true,
  placeholder,
  destructive = false,
  isPending = false,
  error,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const t = useT();
  const describeError = useErrorMessage();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setReason('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const tooShort = requireReason && reason.trim().length < MIN_REASON;

  return (
    <dialog
      ref={ref}
      // Escape and the backdrop both route through the same close path, so
      // the parent's `open` state can never disagree with the DOM.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="bg-surface backdrop:bg-ink/40 m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg p-0 shadow-xl backdrop:backdrop-blur-[2px]"
    >
      <form
        method="dialog"
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!tooShort && !isPending) onConfirm(reason.trim());
        }}
      >
        <h2 className="text-ink text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{description}</p>

        {requireReason && (
          <label className="mt-4 block">
            <span className="text-ink text-sm font-semibold">{t('admin.reason')}</span>
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value.slice(0, MAX_REASON));
              }}
              rows={3}
              autoFocus
              placeholder={placeholder ?? t('admin.reasonPlaceholder')}
              className="bg-surface-sunken text-ink placeholder:text-ink-subtle focus-visible:outline-primary mt-1.5 w-full resize-none rounded-md p-3 text-sm leading-relaxed outline-none focus-visible:outline-2"
            />
            <span className="text-ink-subtle mt-1 block text-right text-xs tabular-nums">
              {reason.length}/{MAX_REASON}
            </span>
          </label>
        )}

        {error != null && (
          <p role="alert" className="bg-danger/10 text-danger mt-3 rounded-md p-3 text-sm">
            {describeError(error)}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant={destructive ? 'danger' : 'primary'}
            disabled={tooShort}
            isLoading={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
