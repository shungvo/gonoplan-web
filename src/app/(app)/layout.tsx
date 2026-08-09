import { BottomNav } from '@/components/layout/BottomNav';

/**
 * The mobile app shell.
 *
 * `dvh` rather than `vh` because iOS Safari's `100vh` includes the area behind
 * the URL bar, so a full-height layout overflows by roughly 60px and the
 * bottom nav sits off-screen until the user scrolls.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto overscroll-contain pb-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
