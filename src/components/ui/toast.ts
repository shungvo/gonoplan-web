'use client';

import { create } from 'zustand';
import { ApiError } from '@/lib/api/errors';
import type { MessageKey } from '@/i18n/messages/keys';

export type ToastTone = 'error' | 'success';

/**
 * What a toast says, before it is said in any particular language.
 *
 * Nothing here is a finished sentence. A toast raised from a background
 * handler has no hooks available to translate with, and a toast still on
 * screen when the reader switches language should switch with it — so the
 * catalogue lookup happens where it renders, not where it is raised.
 */
export interface ToastContent {
  tone: ToastTone;
  /** A stable server error code, resolved through `error.<CODE>`. */
  code?: string;
  /** A key from our own catalogue, for messages we author. */
  messageKey?: MessageKey;
  /** The server's own prose. Used only when we have nothing for the code. */
  fallback?: string;
}

export interface Toast extends ToastContent {
  id: string;
}

/**
 * Three at once, oldest dropped.
 *
 * A stack that grows without limit turns a burst of failures — a queue of
 * writes replayed after reconnecting — into a wall that covers the screen it
 * is reporting on.
 */
const MAX_VISIBLE = 3;

let counter = 0;

function sameMessage(a: ToastContent, b: ToastContent): boolean {
  return a.code === b.code && a.messageKey === b.messageKey && a.fallback === b.fallback;
}

interface ToastState {
  toasts: Toast[];
  show: (content: ToastContent) => void;
  dismiss: (id: string) => void;
  /** Test seam. */
  clear: () => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  show: (content) => {
    set((state) => {
      /*
       * A repeat replaces its predecessor rather than stacking under it.
       *
       * Pressing a failing button twice is ordinary — the first attempt looked
       * like it did nothing. Two identical messages read as two separate
       * problems, and the new id restarts the timer, which is what somebody
       * pressing again is actually asking for.
       */
      const withoutRepeat = state.toasts.filter((toast) => !sameMessage(toast, content));

      counter += 1;
      const next = [...withoutRepeat, { ...content, id: `toast-${String(counter)}` }];

      return { toasts: next.slice(-MAX_VISIBLE) };
    });
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  clear: () => {
    set({ toasts: [] });
  },
}));

/** Raises a toast from outside React — the global mutation handler uses this. */
export function showToast(content: ToastContent): void {
  useToastStore.getState().show(content);
}

/**
 * Turns a thrown error into something sayable.
 *
 * The code travels rather than the message: `src/common/errorCodes.ts` in the
 * API is explicit that `code` is the contract and `message` is prose that may
 * be reworded or translated at any time. The prose comes along only as the
 * fallback for a code we have not written words for yet.
 */
export function errorToast(error: unknown): ToastContent {
  if (error instanceof ApiError) {
    return { tone: 'error', code: error.code, fallback: error.message };
  }
  return { tone: 'error', messageKey: 'common.somethingWrong' };
}
