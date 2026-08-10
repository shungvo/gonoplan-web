'use client';

import { useSyncExternalStore } from 'react';

/*
 * A single shared clock.
 *
 * Relative timestamps need the current time, and the current time is external
 * state — it changes without React doing anything, and it differs between the
 * server and the browser. Reading `Date.now()` in a render body is both a
 * purity violation and a hydration mismatch waiting to happen; setting it from
 * an effect trades that for a cascading render on mount.
 *
 * `useSyncExternalStore` is the answer to exactly this shape: the server
 * snapshot is 0 (callers render an absolute date), and the client subscribes to
 * one interval shared by every timestamp on the page rather than one per row.
 * A queue left open on a second monitor also stays honest, because the minute
 * tick re-renders "2 minutes ago" into "3 minutes ago".
 */
const TICK_MS = 60_000;

const listeners = new Set<() => void>();
let snapshot = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Setting the snapshot here rather than in a module initialiser keeps it out
  // of the server bundle's import side effects. React re-reads getSnapshot
  // immediately after subscribing, so this first value is never missed.
  snapshot = Date.now();

  timer ??= setInterval(() => {
    snapshot = Date.now();
    for (const notify of listeners) notify();
  }, TICK_MS);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Milliseconds since the epoch, or 0 while server-rendering. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => 0,
  );
}
