import { Capacitor } from '@capacitor/core';

/**
 * Whether this build should run a service worker at all.
 *
 * Not under `next dev`: a worker that caches the shell is the opposite of what
 * hot reload needs, and one left behind on `localhost` keeps serving a stale
 * app long after the code that registered it is gone.
 *
 * Not inside the iOS app: every file is already on the device, and a WebView
 * loading from `capacitor://` has no service worker support to register with.
 */
function isSupported(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    !Capacitor.isNativePlatform()
  );
}

export async function registerServiceWorker(): Promise<void> {
  if (!isSupported()) return;

  try {
    // `updateViaCache: 'none'` so the browser never checks for a new worker
    // against a cached copy of the old one — the header in next.config.ts
    // says the same thing, but a static host is free to ignore it.
    await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  } catch {
    // Private browsing, a blocked origin, a full disk. The app works without
    // a worker; it just does not work offline.
  }
}

/**
 * Drops the API responses the worker has kept.
 *
 * Called on sign-out, for the same reason the query cache is cleared there: a
 * response fetched while signed in can describe that person, and the next
 * visitor on the same phone should not be shown it when the network drops.
 */
export function clearOfflineApiCache(): void {
  if (!isSupported()) return;
  navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_API_CACHE' });
}
