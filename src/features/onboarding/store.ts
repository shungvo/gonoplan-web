'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface OnboardingState {
  /**
   * Undefined until the persisted value has been read back.
   *
   * A plain `false` default would flash the whole onboarding overlay at every
   * returning user for one frame before rehydration corrected it — which is
   * worse than a beat of nothing, because it looks like the app forgot them.
   */
  completed: boolean | undefined;
  complete: () => void;
  /** Test and support seam; nothing in the UI calls this. */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: undefined,
      complete: () => {
        set({ completed: true });
      },
      reset: () => {
        set({ completed: false });
      },
    }),
    {
      name: 'gonoplan.onboarding',
      storage: createJSONStorage(() => localStorage),
      // Marked seen on rehydration when storage holds nothing, so a first-time
      // visitor resolves to `false` rather than staying `undefined` forever.
      onRehydrateStorage: () => (state) => {
        if (state && state.completed === undefined) state.completed = false;
      },
    },
  ),
);

/**
 * Whether onboarding still owns the screen.
 *
 * Exported separately because more than the overlay needs it: the location
 * chip auto-prompts on a cold start, and a browser permission dialog appearing
 * behind an onboarding sheet is both confusing and the fastest way to get a
 * refusal — the one answer that cannot be asked again.
 */
export function useOnboardingPending(): boolean {
  return useOnboardingStore((state) => state.completed === false);
}
