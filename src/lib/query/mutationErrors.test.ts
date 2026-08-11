import { beforeEach, describe, expect, it } from 'vitest';
import { MutationObserver } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { useToastStore } from '@/components/ui/toast';
import { createQueryClient } from './QueryProvider';

/**
 * The rule this file exists to hold: a failed write is reported unless the
 * mutation says it reports itself.
 *
 * Tested through the real client rather than by calling the handler directly,
 * because the thing that broke before was the wiring — thirty mutations, three
 * `onError` handlers, and every moderation decision failing in silence.
 */
async function runFailing(
  client: ReturnType<typeof createQueryClient>,
  meta?: { inlineError?: boolean },
): Promise<void> {
  const observer = new MutationObserver(client, {
    mutationFn: () => Promise.reject(new ApiError(403, 'PLACE_SELF_APPROVE_FORBIDDEN', 'Nope')),
    ...(meta ? { meta } : {}),
  });

  await observer.mutate().catch(() => undefined);
}

const toasts = () => useToastStore.getState().toasts;

beforeEach(() => {
  useToastStore.getState().clear();
});

describe('failed mutations', () => {
  it('raise a toast by default', async () => {
    await runFailing(createQueryClient());

    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toMatchObject({
      tone: 'error',
      code: 'PLACE_SELF_APPROVE_FORBIDDEN',
    });
  });

  it('stay quiet when the caller renders the error itself', async () => {
    await runFailing(createQueryClient(), { inlineError: true });

    // Otherwise a form would say it twice: once under the field, once overhead.
    expect(toasts()).toHaveLength(0);
  });
});
