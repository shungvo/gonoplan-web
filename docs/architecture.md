# gonoplan-web — how the front end works

The app's screens, how data reaches them, how a session survives, how it works
offline, and where each piece of logic lives. The rules code is written to are
in the API repository's `docs/07-conventions.md` (§1 and §3); running it locally
is `docs/06-development.md` there.

---

## 1. One build, two shells

`next build` produces a **static export** in `out/` — an HTML file per route,
JavaScript, and assets. There is no server at runtime.

| | Web | iOS |
|---|---|---|
| Served from | Vercel (any static host works) | bundled into the app by Capacitor (`capacitor://localhost`) |
| API reached | directly at `NEXT_PUBLIC_API_URL` | directly at `NEXT_PUBLIC_API_URL` |
| Refresh token | HttpOnly cookie set by the API | Keychain (`@aparajita/capacitor-secure-storage`) |
| Service worker | registered | not registered — the files are already on the device |
| Basemap | Goong or OpenFreeMap | OpenFreeMap (a key inside an `.ipa` cannot be restricted) |

During development `next dev` serves the same app and **proxies** `/api/v1/*`
to `API_INTERNAL_URL` (`next.config.ts` rewrites), so the browser stays on one
origin and the cookie is first-party. Rewrites do not exist in a static
export, which is why a build needs `NEXT_PUBLIC_API_URL`.

Consequences of having no server:

- Records are linked by **query string** — `/place?p=`, `/plan?id=`, `/u?id=`,
  `/shared?t=` — built only through `src/lib/navigation/links.ts`. The
  `[param]` path routes still exist for pretty web URLs and emit a single
  placeholder page each.
- Pages that read `useSearchParams()` wrap the reader in `<Suspense>` (see
  `app/(detail)/shared/page.tsx` for the pattern).
- Metadata is static per route; a page cannot be titled after the record it
  shows.

---

## 2. Screens

```
src/app/
├── layout.tsx                 root: fonts, i18n, query client, toaster, service worker
├── offline/                   what the service worker serves for an unknown URL offline
├── (app)/                     the tab shell: bottom nav, onboarding gate,
│   │                          offline notice, install prompt
│   ├── page.tsx               Home — rails, categories, map, nearby grid
│   ├── explore/               map + filterable list sheet
│   ├── search/                text search, categories, popular searches
│   ├── plan/                  Plans tab; a plan opens in a sheet over it
│   │   └── [id]/              the same editor as a page
│   ├── me/                    the fourth tab (profile + check-in feed)
│   ├── profile/ · saved/ · settings/
│   ├── places/new/            submit a place
│   ├── owner/                 business dashboard
│   ├── u/ · u/[id]/           public profiles
│   └── soon/                  placeholder tab
├── (detail)/                  pushed screens, no tab bar, no onboarding
│   ├── place/ · place/[idOrSlug]/
│   ├── shared/                a plan opened from its public link
│   ├── reset-password/        from the reset email
│   └── verify-email/          from the verification email
└── (admin)/admin/             overview · moderation · content · users · taxonomy · audit
```

Each `page.tsx` is a thin wrapper; the screen is a component in
`src/features/<feature>/components/`.

### Features

| Folder | What it owns |
|---|---|
| `places` | Home, Explore, detail (page and sheet), cards, rails, gallery, opening hours, submit form |
| `search` | Search screen and its recent-search store |
| `map` | MapLibre canvas, home map, markers by viewport |
| `location` | The location state machine, city picker, location chip |
| `recommendations` | Feed and rails queries, interaction tracking |
| `plans` | Plans tab, day editor, timeline, sharing (link and image), shared-plan page, day maths |
| `reviews` | Review list, summary, write/edit sheet, helpful votes |
| `checkins` | Photo posts and the profile feed |
| `favorites` | Save toggle, saved list, optimistic cache updates |
| `auth` | Session store and restore, sign-in sheet (incl. forgot password), reset and verify screens, profile, settings |
| `users` | Public profile body |
| `owner` | Business registration, dashboard, replies |
| `admin` | The admin shell and its screens |
| `reports` | Report sheet |
| `uploads` | Image picking, compression and upload |
| `geo` | Directions and route preview |
| `categories` | Category glyphs, colours, localized names |
| `onboarding` | First-run panels |
| `pwa` | Service-worker registration, offline notice, install prompt |

---

## 3. Data

### The API client (`src/lib/api/client.ts`)

- `api.get/post/patch/delete` return the envelope's `data`; `api.request`
  returns `{ data, meta }`. A non-2xx response throws `ApiError` with the
  server's `code`, `status` and `message`.
- The **access token** lives in a module variable, never in storage.
- On a 401 the client refreshes **once** — concurrent requests wait on the
  same refresh — and retries. `withAuth: 'optional'` retries without a token
  if refreshing fails; `withAuth: false` sends none (public reads, auth calls).
- Requests carry `credentials: 'include'` for the cookie, and anonymous
  analytics carry an `x-anon-id` from `localStorage`.

### TanStack Query

- The only cache of server data. Defaults: `staleTime` 1 minute, `gcTime`
  30 minutes, no refetch on window focus (mobile tab switches are constant),
  refetch on reconnect, no retry for non-retryable errors, never retry
  mutations.
- Keys in `src/lib/query/keys.ts` or a feature's `xKeys`. Coordinates in keys
  are snapped to a grid (`lib/geo/grid.ts`) so GPS jitter is not a new request.
- A failed mutation shows a toast unless it declares
  `meta: { inlineError: true }` and renders the error itself.
- Signing in or out invalidates or clears the cache: anonymous responses lack
  `isSaved`, `hasVoted`, `canReview`.

### Session

`SessionProvider` calls `restoreSession()` once at start-up: `POST
/auth/refresh` with the cookie (web) or the stored token (iOS). Until it
answers, `isInitializing` is true and screens show a skeleton rather than
"signed out". A network failure at launch keeps the stored token; only a 401
discards it.

### Location

`features/location/store.ts` is a state machine: `IDLE → PROMPTING →
GRANTED | DENIED | UNAVAILABLE`, with a `source` of `GPS`, `MANUAL` (a picked
city), `LAST_KNOWN` or `NONE`. Coordinates and the label persist; the
permission status never does (it can change in system settings between
launches). Denied is a designed path: the city picker opens and everything
works from the chosen city. Home falls back to Hồ Chí Minh City until a
location exists.

---

## 4. Logic worth knowing

### Discovery

- Home asks for **one** request, `/recommendations/collections`, and lays out
  the rails it returns; a rail the API omits is not drawn. A failed feed with
  nothing cached shows an error with a retry.
- The map loads markers for the visible viewport (`useMapMarkers`); the
  bounding box is rounded into the query key so small pans reuse the cache.
- `track(placeId, type, source)` buffers interactions and flushes them in
  batches every 10 s; failures are dropped silently.

### Plans (`features/plans`)

- `day.ts` — pure, tested: today in the **plan's** timezone, days between two
  dates, grouping into next / upcoming / ideas / past, the day's span, and the
  calendar-tile parts (Vietnamese months are written `T11` by hand; `Intl` has
  no short form).
- `time.ts` — minutes-from-midnight ↔ `HH:MM`, gaps across midnight.
- The editor (`PlanEditorScreen`) is used both as a page and inside a sheet
  (`compact`). Reordering is up/down buttons, not drag. Every stop mutation
  answers with the whole plan, written straight into the cache.
- `TravelGap` asks `/geo/directions` for each consecutive pair and flags the
  hop when the plan leaves too little time.
- Sharing: a public link (`useSharePlan` / `useUnsharePlan`, URL from
  `sharedPlanShareUrl(publicOrigin(), token)`) or an image drawn on a canvas
  in the browser (`shareImage.ts`).

### Images

`features/uploads`: the picked image is decoded with
`createImageBitmap(..., { imageOrientation: 'from-image' })`, scaled to at
most 1600 px, and re-encoded through a canvas (PNG stays PNG, everything else
JPEG at 0.85). Re-encoding **drops EXIF**, including GPS. Then: ask the API for
a presigned URL, PUT the blob to storage, confirm the key. `PlaceImage` falls
back to a category-coloured placeholder when a URL is missing or fails to load.

### Account recovery

The sign-in sheet has a third mode, *forgot password*. The confirmation never
says whether the address has an account. `/reset-password` and
`/verify-email` read `?token=`; verification runs as a query (it is safe to
repeat) so React's double mount in development cannot strand it.

---

## 5. Offline and install (`features/pwa`, `public/sw.js`)

The service worker is hand-written. After `next build`,
`scripts/build-sw.mjs` lists every file in `out/` (minus iOS splash images)
into one line of `out/sw.js` and versions the cache by a hash of their
contents.

| Request | Strategy |
|---|---|
| The app's own files | precached at install, all or nothing; navigations fall back to `/offline/` |
| Public discovery reads (categories, recommendations, nearby, map, popular searches, place detail, reviews) | network first, 3 s timeout, then the last copy (≤ 80 entries) |
| Everything else under `/api/v1` | never cached |
| Map tiles (Goong, OpenFreeMap) | cache first, 7 days, ≤ 300 entries |
| Cross-origin images | cache first, 30 days, ≤ 60 entries |

A new worker waits until every tab has closed before taking over. Signing out
posts `CLEAR_API_CACHE` to drop cached API responses. Registration happens
after `load`, only in production builds, never in the native shell.

`OfflineNotice` shows a pill above the nav while offline; `InstallPrompt`
offers installation once after onboarding (Chromium: the real prompt; iOS: a
Share-menu hint).

---

## 6. Strings and formatting

- `src/i18n/messages/en.ts` defines the keys; `vi.ts` must define every one
  (a type error otherwise). Vietnamese is the default locale; the choice is
  stored on the account and in a cookie.
- `useT()` translates, with `{placeholder}` interpolation and plural forms.
- `useErrorMessage()` turns an `ApiError` into `error.<CODE>` from the
  catalogue, falling back to the server's prose only for a code with no
  translation.
- `i18n/format.ts` formats dates, relative times and distances through `Intl`.

---

## 7. Design system

- **Tokens** in `src/app/globals.css` (`@theme`): colours (`primary`, `ink`,
  `ink-muted`, `ink-subtle`, `surface`, `surface-sunken`, `background`,
  `border`, `success`, `warning`, `danger`), a type scale from `text-3xs`
  (11 px) to `text-title` (28 px), radii, and a shadow ladder (`shadow-sm` for
  resting, `shadow-md` for things you can pick up, `shadow-lg` for overlays,
  `shadow-sheet` for bottom sheets).
- **Utilities**: `press-firm` / `press-soft` / `press-surface` (pressed
  feedback by size), `tap-44` (44 px hit area around a smaller control),
  `pt-safe` / `pb-safe-float` / `px-safe` / `pb-nav` (safe areas and nav
  clearance), `scrollbar-none`.
- **Components** in `src/components/ui`: `Button`, `BottomSheet` (vaul, with
  snap points), `EmptyState`, `Chip`, `Avatar`, `BackButton`, `Rating`,
  `Skeleton`, `RichText` / `RichTextEditor`, `Toaster` / `toast`.
- Category colours come from the API; a category's glyph is
  `features/categories/CategoryGlyph`.
- Light theme only. Pinch-zoom is disabled on purpose (`app/layout.tsx`
  explains the trade); text still follows the OS font-size setting.

---

## 8. iOS

```bash
npm run build          # with NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL and
                       # NEXT_PUBLIC_MAP_PROVIDER=openfreemap in .env.production.local
npx cap sync ios
npx cap open ios       # then Run in Xcode
```

The API recognises the app by its `capacitor://localhost` origin and hands it
the refresh token in the body (`NATIVE_ORIGINS`). Sessions persist in the
Keychain across launches.

---

## 9. Where to start for common changes

| Change | Start here |
|---|---|
| A new screen | `src/app/<group>/<route>/page.tsx` → a component in `features/<x>/components` |
| A new API call | `features/<x>/api.ts` (typed from `src/types/api.d.ts`) → a hook in `features/<x>/hooks` |
| A new string | `src/i18n/messages/en.ts` and `vi.ts` |
| A new error message | `error.<CODE>` in both catalogues |
| A link to a record | `src/lib/navigation/links.ts` |
| Something that should work offline | `CACHEABLE_API` in `public/sw.js` — public reads only |
| A colour, size or shadow | a token in `globals.css`, not a literal |
