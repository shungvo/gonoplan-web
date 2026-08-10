import type { MetadataRoute } from 'next';

/**
 * PWA manifest (§33).
 *
 * `display: standalone` plus the iOS metadata in layout.tsx is what makes a
 * home-screen launch feel like an app rather than a bookmark. Icons and
 * screenshots are filled in during Phase 13 (PWA), together with the service
 * worker.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gonoplan — discover where to go',
    short_name: 'Gonoplan',
    description: 'Discover where to go, eat and stay — wherever you are.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#edf4fb',
    theme_color: '#edf4fb',
    categories: ['travel', 'lifestyle', 'navigation'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // A maskable icon prevents Android from framing the logo in a white
      // square on adaptive-icon launchers.
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
