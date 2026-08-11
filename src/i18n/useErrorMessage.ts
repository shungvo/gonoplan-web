'use client';

import { ApiError } from '@/lib/api/errors';
import { useT } from './I18nProvider';
import { en } from './messages/en';
import type { MessageKey } from './messages/keys';

/** Whether a code has prose of our own, without reaching for a try/catch. */
function messageKeyFor(code: string): MessageKey | null {
  const key = `error.${code}`;
  return key in en ? (key as MessageKey) : null;
}

/**
 * A stable server code, said in the reader's language — or null when we have
 * nothing of our own for it.
 *
 * Codes reach the client from more than one place: thrown `ApiError`s, and
 * fields like `cannotReviewCode` that report a refusal without failing. Both
 * want the same lookup.
 */
export function useCodeMessage(): (code: string | null | undefined) => string | null {
  const t = useT();

  return (code) => {
    if (!code) return null;
    const key = messageKeyFor(code);
    return key ? t(key) : null;
  };
}

/**
 * Turns a thrown error into a sentence in the reader's language.
 *
 * `src/common/errorCodes.ts` in the API says it outright: the client switches
 * on `code`, and `message` is prose that may be reworded or translated at any
 * time. This is the client half of that contract — until now every error state
 * in the app rendered the server's English straight onto the screen.
 *
 * An unmapped code falls back to the server's own wording rather than to a
 * generic apology. A new code shipping before its translation should read
 * awkwardly, not uselessly: "Place already claimed" in English beats
 * "Something went wrong" in Vietnamese.
 */
export function useErrorMessage(): (error: unknown) => string {
  const t = useT();
  const messageForCode = useCodeMessage();

  return (error: unknown): string => {
    if (error instanceof ApiError) return messageForCode(error.code) ?? error.message;
    return t('common.somethingWrong');
  };
}
