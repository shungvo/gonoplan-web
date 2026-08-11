import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { QueryProvider } from '@/lib/query/QueryProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getLocale, getT } from '@/i18n/server';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'vietnamese'] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return {
    title: { default: 'Gonoplan', template: '%s · Gonoplan' },
    description: t('meta.appDescription'),
    applicationName: 'Gonoplan',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      // Makes an iOS home-screen launch open without Safari chrome. iOS has no
      // `beforeinstallprompt`, so this metadata plus a hand-rolled "Add to Home
      // Screen" hint is the entire iOS install story (Phase 13).
      capable: true,
      title: 'Gonoplan',
      statusBarStyle: 'default',
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the app paint into the notch and home-indicator areas; the `*-safe`
  // utilities then pad content back out of them.
  viewportFit: 'cover',
  themeColor: '#ffffff',
  /*
   * Pinch-zoom off, so the app reads as an app rather than a page.
   *
   * This is a real accessibility cost and worth stating plainly: someone who
   * magnifies text can no longer do it here. Two things keep it from being a
   * failure. `-webkit-text-size-adjust` is untouched and every size is in
   * `rem`, so the OS-level font-size setting still scales the whole app — the
   * control most people actually use. And the map, the one surface where
   * zooming is the point, keeps its own gestures (see `touch-action` in
   * globals.css).
   */
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Resolved here rather than per screen so `lang` and every string below it
  // agree, and so a Client Component never has to guess before hydration.
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${geist.variable} antialiased`}>
      <body className="font-sans">
        <I18nProvider locale={locale}>
          <QueryProvider>{children}</QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
