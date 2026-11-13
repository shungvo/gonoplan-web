'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * How this device can be offered the app, if at all.
 *
 * - `prompt`: the browser handed us an install prompt to show (Chromium).
 * - `ios`: there is no prompt to show and never will be — Safari installs only
 *   through its own Share menu, so all we can do is say where that is.
 * - `none`: say nothing.
 */
export type InstallMode = 'prompt' | 'ios' | 'none';

export interface InstallEnvironment {
  /** Running inside the Capacitor shell. */
  native: boolean;
  /** Already launched from the home screen. */
  standalone: boolean;
  ios: boolean;
  /** A `beforeinstallprompt` event is being held. */
  canPrompt: boolean;
  online: boolean;
  /** The offer has been turned down before. */
  dismissed: boolean;
  /** First-run onboarding still owns the screen. */
  onboarding: boolean;
}

export function resolveInstallMode(env: InstallEnvironment): InstallMode {
  // Already an app, one way or the other.
  if (env.native || env.standalone) return 'none';
  // Asked once. An offer that comes back after "not now" is a nag.
  if (env.dismissed) return 'none';
  // One thing at a time, and installing needs the network anyway.
  if (env.onboarding || !env.online) return 'none';

  if (env.canPrompt) return 'prompt';
  return env.ios ? 'ios' : 'none';
}

/**
 * iPadOS reports itself as a Mac, so the user agent alone misses every iPad
 * made since 2019. A "Mac" with a touchscreen is one.
 */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return userAgent.includes('Macintosh') && maxTouchPoints > 1;
}

interface InstallState {
  /** Undefined until read back from storage, so the card cannot flash. */
  dismissed: boolean | undefined;
  dismiss: () => void;
  /** Test and support seam; nothing in the UI calls this. */
  reset: () => void;
}

export const useInstallStore = create<InstallState>()(
  persist(
    (set) => ({
      dismissed: undefined,
      dismiss: () => {
        set({ dismissed: true });
      },
      reset: () => {
        set({ dismissed: false });
      },
    }),
    {
      name: 'gonoplan.install',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.dismissed === undefined) state.dismissed = false;
      },
    },
  ),
);
