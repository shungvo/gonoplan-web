import type { ReactNode } from 'react';

/**
 * Pushed screens: no tab bar.
 *
 * The detail page owns the bottom of the screen with its own action bar, and
 * stacking that above the tab bar puts two fixed bars in the same 140px. A
 * detail page is somewhere you were pushed to, not a tab you switched to — the
 * back button and the swipe gesture are the way out.
 *
 * Same centred column as the tab shell. This group was the one route outside
 * it, so on a monitor the page ran the full 1440px while its own action bar —
 * `fixed` and capped at `max-w-app` — sat in a 480px island in the middle,
 * hairline ending in mid-air. Prose ran 1400px to a line, which no reader
 * tracks. Document scroll rather than the shell's `h-dvh` + inner scroller:
 * this is a page you were pushed to, so browser scroll restoration and the
 * mobile URL bar's hide-on-scroll should both behave normally.
 */
export default function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-sunken flex min-h-dvh justify-center">
      <div className="border-border bg-background relative w-full max-w-app sm:border-x">
        {children}
      </div>
    </div>
  );
}
