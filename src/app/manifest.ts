/*
 * Static, so it survives `output: 'export'`.
 *
 * The manifest is a route handler, and an exported build has no server to run
 * one — Next refuses to collect it without being told the output never
 * changes. It never does: every value here is a constant.
 */
export const dynamic = 'force-static';

import type { MetadataRoute } from 'next';
import { getLocale, getT } from '@/i18n/server';

/**
 * PWA manifest (§33).
 *
 * `display: standalone` plus the iOS metadata in layout.tsx is what makes a
 * home-screen launch feel like an app rather than a bookmark.
 *
 * Every file referenced here is drawn by `scripts/generate-app-assets.mjs` and
 * committed. They were listed here long before they existed, so until now the
 * three icon URLs answered 404 and an install prompt had nothing to show.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const t = await getT();

  return {
    name: t('manifest.name'),
    short_name: 'Gonoplan',
    description: t('meta.appDescription'),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    categories: ['travel', 'lifestyle', 'navigation'],
    lang: locale,
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // A maskable icon prevents Android from framing the logo in a white
      // square on adaptive-icon launchers. Drawn to a tighter inset than the
      // two above, because a launcher's circular mask keeps only the middle
      // 80% and the pin's tip is the first thing it would take.
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
