import type { NextConfig } from 'next';

/**
 * The API base the rewrite proxy forwards to. Server-side only — it is never
 * inlined into the client bundle, because the browser never talks to the API
 * directly.
 */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/**
 * One build, static, for the browser and for iOS alike.
 *
 * It was going to be two — `output: 'export'` behind a flag so the web kept
 * server rendering and its API proxy — and that was dropped once SSR turned
 * out not to be wanted. Two build modes means two sets of behaviour to reason
 * about and only one of them gets tested; a single static bundle is the same
 * artefact everywhere, which is the whole reason Capacitor can wrap it.
 *
 * What goes with SSR: the `rewrites` proxy below stops applying to builds
 * (`next dev` still honours it), so a built client talks to the API directly
 * and needs `NEXT_PUBLIC_API_URL` set. That in turn is why the session can no
 * longer ride an HttpOnly cookie — see `gonoplan-api/src/modules/auth/
 * cookies.ts`, which explains why a cross-origin API forces `sameSite: 'none'`
 * and Safari ITP blocks it.
 */
const nextConfig: NextConfig = {
  output: 'export',
  /*
   * `route/index.html` rather than `route.html`.
   *
   * Capacitor serves the bundle off a local handler that resolves a path to a
   * file literally — nothing turns `/explore` into `explore.html`. With
   * trailing slashes every route is a directory with an `index.html` in it,
   * which is the one shape every static host resolves the same way.
   */
  trailingSlash: true,
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
    /*
     * The optimiser is a server route (`/_next/image`), and a static export
     * has no server to run it. Unoptimised is not a downgrade here: every
     * photo already comes from object storage at a size the client asked for
     * through `sizes`, so what is lost is a resize the bucket was not doing
     * anyway.
     */
    unoptimized: true,
    /*
     * Every origin a place photo may come from.
     *
     * `next/image` refuses an unlisted host outright, which is the correct
     * default and also the reason an upload can appear to succeed while every
     * photo renders as a broken box — the failure is in the optimiser, not in
     * the storage.
     *
     * The MinIO entry is development only; `S3_PUBLIC_URL` decides the real
     * one, so add the production bucket or CDN host here when that is set.
     * See gonoplan-api/docs/04-storage.md §5.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000', pathname: '/**', search: '' },
    ],

    /*
     * Lets the optimiser fetch from MinIO, and never ships to production.
     *
     * Next 16 refuses to fetch an image from a hostname that resolves to a
     * private IP — a genuine SSRF guard, since `/_next/image?url=` is an
     * attacker-controllable server-side fetch, and without it anyone could
     * point it at `169.254.169.254` and read cloud metadata. `localhost` is a
     * private IP, so the local bucket is blocked by exactly that rule.
     *
     * Safe here for one reason only: in development the URL is our own
     * docker-compose MinIO. In production the bucket or CDN is a public host,
     * so this is not needed — and the environment check is what guarantees it
     * cannot be switched on there by accident.
     *
     * The failure it fixes is silent and misleading: the upload succeeds, the
     * object is in the bucket and publicly readable, and every photo still
     * renders as an empty box because the *optimiser* refused it.
     */
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',

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
