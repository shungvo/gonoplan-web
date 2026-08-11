import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { errorToast, useToastStore, showToast } from './toast';

const state = () => useToastStore.getState();

beforeEach(() => {
  state().clear();
});

describe('errorToast', () => {
  it('carries the code, and the server prose only as a fallback', () => {
    const error = new ApiError(403, 'PLACE_SELF_APPROVE_FORBIDDEN', 'You cannot approve…');

    expect(errorToast(error)).toEqual({
      tone: 'error',
      code: 'PLACE_SELF_APPROVE_FORBIDDEN',
      fallback: 'You cannot approve…',
    });
  });

  it('falls back to a generic message for anything that is not an ApiError', () => {
    expect(errorToast(new TypeError('undefined is not a function'))).toEqual({
      tone: 'error',
      messageKey: 'common.somethingWrong',
    });
  });
});

describe('the toast stack', () => {
  it('replaces a repeat rather than stacking under it', () => {
    // Pressing a failing button twice is ordinary — the first press looked
    // like it did nothing.
    showToast({ tone: 'error', code: 'AUTH_FORBIDDEN' });
    const first = state().toasts[0]?.id;

    showToast({ tone: 'error', code: 'AUTH_FORBIDDEN' });

    expect(state().toasts).toHaveLength(1);
    // A new id, so the dismiss timer starts again — which is what pressing
    // again is actually asking for.
    expect(state().toasts[0]?.id).not.toBe(first);
  });

  it('keeps distinct failures apart', () => {
    showToast({ tone: 'error', code: 'AUTH_FORBIDDEN' });
    showToast({ tone: 'error', code: 'PLAN_LIMIT_REACHED' });

    expect(state().toasts.map((toast) => toast.code)).toEqual([
      'AUTH_FORBIDDEN',
      'PLAN_LIMIT_REACHED',
    ]);
  });

  it('drops the oldest past three, so a burst cannot cover the screen', () => {
    for (const code of ['A', 'B', 'C', 'D']) showToast({ tone: 'error', code });

    expect(state().toasts.map((toast) => toast.code)).toEqual(['B', 'C', 'D']);
  });

  it('dismisses by id', () => {
    showToast({ tone: 'error', code: 'A' });
    showToast({ tone: 'error', code: 'B' });

    const target = state().toasts[0];
    state().dismiss(target?.id ?? '');

    expect(state().toasts.map((toast) => toast.code)).toEqual(['B']);
  });
});
