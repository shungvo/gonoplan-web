import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored MapLibre worker bundle, published by
    // scripts/copy-maplibre-worker.mjs. Minified third-party output — linting
    // it produces a thousand warnings about code we do not own or edit.
    "public/maplibre/**",
    // Generated from the API contract; never hand-edited.
    "src/types/api.d.ts",
  ]),
]);

export default eslintConfig;
