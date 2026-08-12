'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Back, or somewhere sensible when there is no back.
 *
 * The fallback is the part that matters: a shared link, a bookmark or a cold
 * start opens a screen with nothing behind it, and `router.back()` there either
 * does nothing or walks out of the app.
 *
 * ─── Why this is a hook and not three copies ──────────────────────────────
 *
 * It was three copies, and one of them was wrong. The account settings screen
 * used `router.push('/profile')` instead of going back, which *adds* a history
 * entry rather than removing one:
 *
 *     1. /profile          (from the avatar)
 *     2. /profile/settings
 *     3. /profile          ← pushed by the "back" button
 *
 * From entry 3, the system back button goes to entry 2 — settings. Press it
 * again and you are back at 3. Profile, settings, profile, settings, forever,
 * with no way out but the tab bar. A push that looks like a back is a trap
 * that only shows up on the *second* press, which is why it survived.
 */
export function useGoBack(fallback = '/'): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}
