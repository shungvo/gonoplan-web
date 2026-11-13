'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Whether the device believes it has a network.
 *
 * `navigator.onLine` is only trustworthy in one direction: `false` means there
 * is certainly no connection, `true` means only that an interface is up. That
 * is the direction this is used in — to say "you are offline", never to
 * promise that a request will succeed.
 *
 * The prerendered HTML assumes online, so nothing flashes at the common case.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

const noop = () => () => undefined;

/** False in the prerendered HTML and on the first client render, true after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
