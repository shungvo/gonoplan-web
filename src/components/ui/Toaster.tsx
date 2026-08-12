'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';
import { useCodeMessage } from '@/i18n/useErrorMessage';
import { cn } from '@/lib/utils/cn';
import { useToastStore, type Toast } from './toast';

/** Long enough to read a sentence twice; errors get longer than confirmations. */
const DURATION_MS: Record<Toast['tone'], number> = {
  error: 6000,
  success: 4000,
};

/**
 * Where failures become visible.
 *
 * The app had nowhere to put one. Every mutation either rendered its error
 * inline or dropped it, and the ones that dropped it — approving a place,
 * banning a user, every button in the admin queues — failed in complete
 * silence: the request 403'd, the row stayed put, and the only way to find out
 * why was the network tab.
 *
 * Anchored to the top rather than above the bottom nav, because the bottom is
 * where the sheets are. Half the writes in this app are fired from inside one,
 * and a message that appears underneath the sheet that caused it is no message
 * at all.
 */
export function Toaster() {
  const t = useT();
  const toasts = useToastStore((state) => state.toasts);
  const ref = useRef<HTMLDivElement>(null);

  /*
   * The top layer, not a big z-index.
   *
   * `ReasonDialog` is a native `<dialog>` opened with `showModal()`, which
   * puts it in the top layer — above every stacking context on the page, so no
   * z-index can reach over it. A popover is the one other thing that lives up
   * there. Browsers without it fall back to `z-50`, where a toast still clears
   * everything except an open modal.
   *
   * Shown per toast rather than once on mount, because the top layer is
   * ordered by when things enter it: a popover opened at startup would sit
   * *under* a dialog opened later, which is the arrangement this is meant to
   * avoid.
   */
  useEffect(() => {
    const node = ref.current;
    if (typeof node?.showPopover !== 'function') return;

    const sync = () => {
      const open = node.matches(':popover-open');
      if (toasts.length > 0 && !open) node.showPopover();
      if (toasts.length === 0 && open) node.hidePopover();
    };

    sync();

    /*
     * Re-asserted rather than assumed.
     *
     * A closed popover is `display: none`, so if anything closes this while a
     * message is still up — the page has several other things competing for
     * the top layer, and a dev-server hot update alone was enough to do it —
     * the toast is not merely demoted, it is invisible. That is a worse
     * failure than the one this whole file exists to fix, so the state is
     * restored whenever it changes underneath us.
     */
    node.addEventListener('toggle', sync);
    return () => {
      node.removeEventListener('toggle', sync);
    };
  }, [toasts.length]);

  return (
    <div
      ref={ref}
      popover="manual"
      // A landmark, not the announcer — each toast carries its own `alert` or
      // `status` role, which is what gets read out when the row is inserted.
      role="region"
      aria-label={t('toast.regionLabel')}
      className={cn(
        'px-safe pt-safe-float pointer-events-none fixed inset-x-0 top-0 bottom-auto z-50 mx-auto max-w-app',
        // Undoes the popover UA stylesheet, which centres the element in the
        // viewport and gives it a border, padding and an opaque background.
        'm-0 h-auto max-h-none w-auto max-w-none overflow-visible border-0 bg-transparent p-0',
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastRow key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const t = useT();
  const messageForCode = useCodeMessage();
  const dismiss = useToastStore((state) => state.dismiss);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss(toast.id);
    }, DURATION_MS[toast.tone]);

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, toast.tone, dismiss]);

  /*
   * Resolved here rather than at the call site, so a toast raised from a
   * handler with no hooks still speaks the reader's language — and an unmapped
   * code falls back to the server's own prose rather than to a generic
   * apology. A code shipping ahead of its translation should read awkwardly,
   * not uselessly.
   */
  const message =
    (toast.code ? messageForCode(toast.code) : null) ??
    (toast.messageKey ? t(toast.messageKey) : null) ??
    toast.fallback ??
    t('common.somethingWrong');

  const isError = toast.tone === 'error';
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      // `alert` is announced immediately and interrupts; `status` waits for a
      // pause. A failure the user is about to retry cannot wait for a pause.
      role={isError ? 'alert' : 'status'}
      className="bg-surface border-border pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg"
    >
      <span
        className={cn(
          'mt-px flex size-6 shrink-0 items-center justify-center rounded-full',
          isError ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <p className="text-ink min-w-0 flex-1 text-sm leading-snug">{message}</p>

      <button
        type="button"
        onClick={() => {
          dismiss(toast.id);
        }}
        aria-label={t('common.close')}
        className="text-ink-subtle -m-1 shrink-0 rounded-full p-1"
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}
