import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `.mts`, not `.ts`: this package is CommonJS (Next needs it that way), so a
// `.ts` config gets loaded through `require()` and fails on Vitest's ESM-only
// dependencies. The explicit extension forces ESM loading.
export default defineConfig({
  plugins: [react()],
  test: {
    // `node` by default — most tests here are pure logic (scoring, distance,
    // opening hours) and run faster without a DOM. Component tests opt in per
    // file with `// @vitest-environment jsdom`.
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
