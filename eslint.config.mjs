import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next, widened to any depth. Anchored at
    // the root these miss a nested build directory, and an agent worktree under
    // `.claude/worktrees/` carries its own `.next` — 414 errors from minified
    // Turbopack chunks, which buries every real finding in `src`.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
    // Vendored MapLibre worker bundle, published by
    // scripts/copy-maplibre-worker.mjs. Minified third-party output — linting
    // it produces a thousand warnings about code we do not own or edit.
    "public/maplibre/**",
    // Generated from the API contract; never hand-edited.
    "src/types/api.d.ts",
    // Agent worktrees are a second checkout of this same repo. Linting one
    // reports every finding twice, at a path nobody edits, and drags its build
    // output and vendored bundles in with it.
    ".claude/worktrees/**",
    // Where `cap sync` copies `out/`. Same minified chunks, a second time,
    // under a path `**/out/**` does not match — 8,600 findings in code nobody
    // wrote by hand. Capacitor's own .gitignore already excludes it from the
    // repo; this excludes it from the lint.
    "ios/App/App/public/**",
  ]),
]);

export default eslintConfig;
