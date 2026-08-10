import type { ReactNode } from 'react';

/**
 * Pushed screens: no tab bar.
 *
 * The detail page owns the bottom of the screen with its own action bar, and
 * stacking that above the tab bar puts two fixed bars in the same 140px. A
 * detail page is somewhere you were pushed to, not a tab you switched to — the
 * back button and the swipe gesture are the way out.
 */
export default function DetailLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
