import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { QueryProvider } from '@/lib/query/QueryProvider';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: { default: 'Gonoplan', template: '%s · Gonoplan' },
  description: 'Discover where to go, eat and stay — wherever you are.',
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the app paint into the notch and home-indicator areas; the `*-safe`
  // utilities then pad content back out of them.
  viewportFit: 'cover',
  themeColor: '#edf4fb',
  // Zoom stays enabled. Disabling it is a common mobile-app affectation and an
  // accessibility failure for anyone who needs to magnify text.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`}>
      <body className="font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
