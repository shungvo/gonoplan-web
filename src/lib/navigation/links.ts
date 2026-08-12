/**
 * Every in-app link to a screen that is *about* one record.
 *
 * Query strings, not path segments, and that is a build constraint rather than
 * a preference. The iOS app is a Capacitor shell around `next build --output
 * export`, and a static export has to emit one HTML file per route — so
 * `/place/[slug]` needs `generateStaticParams()` listing every slug that will
 * ever exist. For user-generated places that list cannot be written: an empty
 * array is refused outright ("at least one route must be generated"), and a
 * placeholder generates a shell that no real slug resolves to. A query
 * parameter needs no file of its own, so `/place` is one exported page that
 * serves every place there is.
 *
 * The `[param]` routes stay for the web, where there is a server and pretty
 * URLs are what gets shared. They render the same screens. What changed is
 * only which form the app links to *itself* with — one scheme in the product,
 * so a link built here works in both builds.
 *
 * One module rather than twelve template literals, because a scheme spelled
 * out at every call site is a scheme that drifts at one of them.
 */
export const placeHref = (idOrSlug: string): string =>
  `/place?p=${encodeURIComponent(idOrSlug)}`;

export const userHref = (id: string): string => `/u?id=${encodeURIComponent(id)}`;

export const planHref = (id: string): string => `/plan?id=${encodeURIComponent(id)}`;

/**
 * The shareable form — a real path, for a link that leaves the app.
 *
 * Somebody pasting a Gonoplan link into a message should not be pasting a
 * query string, and the web build still serves these.
 */
export const placeShareUrl = (origin: string, slug: string): string =>
  `${origin}/place/${slug}`;
