# gonoplan-web

Mobile-first location discovery PWA.

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · TanStack Query

> Architecture and rationale live in [`../docs`](../docs). Read
> [`00-architecture.md`](../docs/00-architecture.md) before changing structure.

---

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

`http://localhost:3000`. The API must be running on `:4000` — start it with
`npm run dev` in `gonoplan-api`.

---

## The same-origin API proxy

The browser **never** calls the API directly. It requests `/api/v1/*`, which
`next.config.ts` rewrites to the Express service.

This is not a convenience. With the web app on `vercel.app` and the API on
`fly.dev`, the refresh-token cookie is third-party: Safari's ITP blocks it, and
iOS standalone PWAs have historically used a separate cookie jar. Users would be
silently logged out on the primary target platform. Proxying keeps every request
same-origin and the cookie first-party — and removes the need for permissive
CORS. See [`docs/00-architecture.md`](../docs/00-architecture.md) §3.3.

Consequence worth remembering: `NEXT_PUBLIC_*` variables are compiled into the
client bundle. The Goong **REST** key must never appear in this repo. Only the
restricted maptiles key belongs here.

---

## API types are generated, not written

```bash
npm run contract:sync   # pull openapi.json from ../gonoplan-api (or CONTRACT_URL)
npm run codegen         # contracts/openapi.json → src/types/api.d.ts
```

`contracts/openapi.json` is a **pinned copy** of the API contract. The two
services deploy independently, so this repo builds against a known version
rather than a moving target — syncing is an explicit commit where you can see
exactly which endpoints changed.

Never hand-edit `src/types/api.d.ts`. CI runs `codegen:check` and fails on a
diff.

---

## Structure

```
src/
├── app/                  routing and layout only
│   ├── (app)/            authed shell: bottom nav, safe areas
│   └── manifest.ts       PWA manifest
├── components/ui/        design system — imports nothing from features/
├── components/layout/    shell chrome
├── features/<name>/      components · hooks · api · store · types
└── lib/                  api client · query keys · geo · utils
```

**State ownership** — the rule that keeps this from becoming a swamp:

| State | Owner |
|---|---|
| Server data | TanStack Query — the only cache |
| Access token | Module closure in `lib/api/client.ts`. Never `localStorage` |
| Session user | Zustand, in memory, not persisted |
| Location + permission | Zustand, persisted (coordinates only, never `status`) |
| Active filters | URL search params, mirrored into Zustand |
| Sheet position | Local component state |

Nothing from the API is mirrored into Zustand. One cache, no sync bugs.

---

## Mobile constraints already handled

Each of these fixes a specific behaviour that breaks on a real phone:

- `100dvh`, not `100vh` — iOS Safari's `vh` includes the area behind the URL bar.
- `env(safe-area-inset-*)` via `pt-safe` / `pb-safe-float` / `pb-nav`, with a
  floor so floating UI isn't flush to the edge where the inset is `0`.
- `overscroll-behavior-y: none` — stops iOS rubber-banding dragging the app.
- `touch-action: manipulation` on buttons — removes the 300 ms tap delay.
- Zoom stays enabled. Disabling it is an accessibility failure.
- Location permission is a **state machine**, not a boolean. `DENIED` is a
  designed screen; the app is fully usable without GPS.
- iOS has no web haptics API — `navigator.vibrate` is Android-only. Never gate
  UX on it.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` |
| `npm run lint` · `test` | What CI runs |
| `npm run contract:sync` | Pull the API contract |
| `npm run codegen` | Regenerate `src/types/api.d.ts` |
