'use client';

import { api } from '@/lib/api/client';
import { anonId } from './api';

export type InteractionType =
  'VIEW' | 'CARD_IMPRESSION' | 'CLICK' | 'SHARE' | 'DIRECTIONS' | 'CALL' | 'WEBSITE';

export type InteractionSource =
  'MAP' | 'HOME_FEED' | 'SEARCH' | 'EXPLORE' | 'DETAIL' | 'RECOMMENDATION' | 'DEEPLINK';

interface QueuedEvent {
  placeId: string;
  type: InteractionType;
  source: InteractionSource;
}

/**
 * Buffered signal reporting.
 *
 * These fire constantly — a card impression happens on every scroll — so one
 * request per event would put analytics ahead of the product on a mobile
 * connection. Events collect here and leave in batches.
 *
 * Everything is best-effort. A failed flush drops its batch and says nothing:
 * losing a view count is invisible, and a toast about analytics is the worst
 * possible use of a user's attention.
 */
const FLUSH_INTERVAL_MS = 10_000;

/** The API caps a batch at 50; stop well short so a burst cannot be rejected. */
const MAX_QUEUE = 40;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

function flush(): void {
  if (queue.length === 0) return;

  const events = queue;
  queue = [];

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  void api
    .post('/interactions', { events }, { headers: { 'x-anon-id': anonId() } })
    .catch(() => undefined);
}

/**
 * Flushes what is queued as the tab goes away.
 *
 * `visibilitychange`, not `beforeunload`: iOS Safari does not reliably fire
 * `beforeunload` when an app is backgrounded or a PWA is swiped away, which is
 * how most sessions on this app actually end. Without this the last — and most
 * interesting — events of every session are lost.
 */
function attachListeners(): void {
  if (listenersAttached || typeof document === 'undefined') return;
  listenersAttached = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function track(placeId: string, type: InteractionType, source: InteractionSource): void {
  if (typeof window === 'undefined') return;

  attachListeners();
  queue.push({ placeId, type, source });

  if (queue.length >= MAX_QUEUE) {
    flush();
    return;
  }

  timer ??= setTimeout(flush, FLUSH_INTERVAL_MS);
}

/**
 * Sends immediately, for the signals worth more than a scroll.
 *
 * Tapping "directions" is the strongest intent this app can observe and it is
 * usually the last thing someone does before leaving for a maps app — exactly
 * the moment a ten-second timer would lose it.
 */
export function trackNow(placeId: string, type: InteractionType, source: InteractionSource): void {
  if (typeof window === 'undefined') return;
  queue.push({ placeId, type, source });
  flush();
}
