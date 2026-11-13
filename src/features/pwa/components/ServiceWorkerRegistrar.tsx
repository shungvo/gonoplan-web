'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../serviceWorker';

/**
 * Registers the service worker, and renders nothing.
 *
 * After `load`, not on mount: installing the worker downloads the whole shell,
 * and starting that while the first screen is still fetching its own data
 * makes the first visit — the one that decides whether there is a second —
 * slower in exchange for a benefit that only begins on the next one.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    const register = () => {
      void registerServiceWorker();
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => {
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
