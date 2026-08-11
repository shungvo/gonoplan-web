import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { QueryProvider } from '@/lib/query/QueryProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { getLocale, getT } from '@/i18n/server';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'vietnamese'] });

/** Kept in step with `scripts/generate-app-assets.mjs`, which draws the files. */
const SPLASH_DEVICES = [
  { width: 430, height: 932, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return {
    title: { default: 'Gonoplan', template: '%s · Gonoplan' },
    description: t('meta.appDescription'),
    applicationName: 'Gonoplan',
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
      // Makes an iOS home-screen launch open without Safari chrome. iOS has no
      // `beforeinstallprompt`, so this metadata plus a hand-rolled "Add to Home
      // Screen" hint is the entire iOS install story.
      capable: true,
      title: 'Gonoplan',
      statusBarStyle: 'default',
      /*
       * Android builds a launch screen from the manifest's `background_color`
       * and icon. iOS will not: without an exact-size image per device it
       * shows a white flash and then a screenshot of whatever was last on
       * screen, which for a returning user is their own half-scrolled list
       * appearing frozen before the app has loaded.
       *
       * The media query has to match the device exactly — the wrong one is the
       * same as none at all.
       */
      startupImage: SPLASH_DEVICES.map(({ width, height, ratio }) => ({
        url: `/icons/splash-${String(width)}x${String(height)}@${String(ratio)}x.png`,
        media: `(device-width: ${String(width)}px) and (device-height: ${String(height)}px) and (-webkit-device-pixel-ratio: ${String(ratio)}) and (orientation: portrait)`,
      })),
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
