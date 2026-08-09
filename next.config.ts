import type { NextConfig } from 'next';

/**
 * The API base the rewrite proxy forwards to. Server-side only — it is never
 * inlined into the client bundle, because the browser never talks to the API
 * directly.
 */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Same-origin API proxy — the fix for docs/00-architecture.md §3.3.
   *
   * With the web app on vercel.app and the API on fly.dev, the refresh cookie
   * is third-party: Safari ITP blocks it and iOS standalone PWAs have used a
   * separate cookie jar. Users would be silently logged out on the primary
   * target platform.
   *
   * Proxying through Next means the browser only ever sees same-origin
   * requests and a first-party SameSite=Lax cookie. It also removes the need
   * for permissive CORS. Cost: one hop through Vercel's edge.
   *
   * Once a custom domain exists (api.gonoplan.com + app.gonoplan.com), this
   * can be dropped in favour of talking to the API directly.
   */
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_INTERNAL_URL}/api/v1/:path*`,
      },
    ];
  },

  images: {
    // Cloudinary serves every place photo; f_auto/q_auto handle format and
    // quality, so Next only needs to know the origin is trusted.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Geolocation is the app's core input; everything else is denied.
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=()',
          },
        ],
      },
      {
        // The service worker must not be cached, or users get stranded on an
        // old one and stop receiving updates entirely.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
