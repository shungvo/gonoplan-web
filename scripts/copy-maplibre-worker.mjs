#!/usr/bin/env node
/**
 * Publishes MapLibre's worker so the browser can actually fetch it.
 *
 * MapLibre v6 derives its worker URL from `import.meta.url`:
 *
 *     function getWorkerUrl() {
 *       const url = import.meta.url;
 *       if (!/^https?:/.test(url)) return '';   // ← bundled code lands here
 *       ...
 *     }
 *
 * Under any bundler, `import.meta.url` is not an http(s) URL, so this returns
 * an empty string, the worker is never created, and no vector tile is ever
 * requested. The failure is completely silent: the style loads, the sprite
 * loads, the fonts load, the canvas initialises — and the map stays blank
 * forever with no error event.
 *
 * Copying the worker to a real URL and passing it to `setWorkerUrl()` is the
 * supported fix. Both files are required: the worker imports its shared chunk
 * with a relative specifier, so they must sit in the same directory.
 *
 * Runs before `dev` and `build`; the output is generated, so it is gitignored.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repoRoot, 'node_modules/maplibre-gl/dist');
const destination = resolve(repoRoot, 'public/maplibre');

const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

if (!existsSync(source)) {
  throw new Error(`maplibre-gl is not installed — expected ${source}`);
}

await mkdir(destination, { recursive: true });

for (const file of FILES) {
  await copyFile(resolve(source, file), resolve(destination, file));
}

console.log(`Published MapLibre worker → public/maplibre/ (${FILES.join(', ')})`);
