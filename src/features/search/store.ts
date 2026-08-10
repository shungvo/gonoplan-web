'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_RECENT = 8;

interface RecentSearchState {
  recent: string[];
  remember: (query: string) => void;
  forget: (query: string) => void;
  clear: () => void;
}

/**
 * Recent searches, stored on the device.
 *
 * Deliberately local rather than server-side. The server already records every
 * search for the popular-queries aggregate, but "what did *I* look for" is
 * personal history — keeping it on the device means it needs no account, works
 * offline, and disappears when the user clears their browser, which is what
 * people expect of a search box.
 */
export const useRecentSearches = create<RecentSearchState>()(
  persist(
    (set) => ({
      recent: [],

      remember: (query) => {
        const trimmed = query.trim();
        if (trimmed.length < 2) return;

        set((state) => ({
          // Case-insensitive dedupe, most recent first. Re-searching something
          // should move it to the top, not add a second entry.
          recent: [
            trimmed,
            ...state.recent.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
          ].slice(0, MAX_RECENT),
        }));
      },

      forget: (query) => {
        set((state) => ({ recent: state.recent.filter((item) => item !== query) }));
      },

      clear: () => {
        set({ recent: [] });
      },
    }),
    {
      name: 'gonoplan:recent-searches',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
