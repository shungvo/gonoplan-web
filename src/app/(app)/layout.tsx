import { BottomNav } from '@/components/layout/BottomNav';
import { OnboardingGate } from '@/features/onboarding/components/OnboardingGate';

/**
 * The mobile app shell.
 *
 * `dvh` rather than `vh` because iOS Safari's `100vh` includes the area behind
 * the URL bar, so a full-height layout overflows by roughly 60px and the
 * bottom nav sits off-screen until the user scrolls.
 *
 * Centred and capped at `--width-app` on anything wider than a phone. This is
 * a phone app in a browser: stretched to a monitor its rails, chips and type
 * are all sized for a screen four times narrower, which reads as a mistake
 * rather than as a layout. The page behind the column is a shade darker with a
 * hairline down each side, so the width is visibly the app's choice.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="bg-surface-sunken flex h-dvh justify-center">
      <div className="border-border bg-background relative flex h-dvh w-full max-w-app flex-col overflow-hidden sm:border-x">
        <main className="flex-1 overflow-y-auto overscroll-contain pb-nav">{children}</main>
        <BottomNav />
        {/* Over the shell rather than in front of a route, so a first-run
            visitor who lands on a shared place link still gets it — and still
            lands on that place once it is done. */}
        <OnboardingGate />
      </div>
    </div>
  );
}
