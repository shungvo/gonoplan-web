#!/usr/bin/env node
/**
 * Tells the service worker which files make up this build.
 *
 * Runs after `next build` (npm's `postbuild`). It walks `out/`, and rewrites
 * one line of `out/sw.js` with the list of files to precache and a version
 * derived from their contents.
 *
 * The version is a hash of the files rather than a timestamp, so rebuilding
 * the same source produces a byte-identical worker and browsers do not
 * reinstall a shell that has not changed.
 *
 * `public/sw.js` is never touched — only the copy Next put in `out/`.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, 'out');
const workerPath = join(outDir, 'sw.js');

const MARKER = /^const BUILD = .*\/\/ __SW_BUILD__$/m;

/**
 * What the shell needs to start, and nothing else.
 *
 * The iOS splash images are the bulk of `icons/` and are only ever read by
 * Safari at launch, outside any worker's reach. Precaching them would spend a
 * megabyte of somebody's data on files that are never served from the cache.
 */
function belongs(path) {
  if (path === 'sw.js') return false;
  if (path.startsWith('icons/')) return !path.startsWith('icons/splash-') && path.endsWith('.png');
  return true;
}

/** `explore/index.html` is requested as `/explore/`. */
function toUrl(path) {
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
  return `/${path}`;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return files.flat();
}

if (!existsSync(workerPath)) {
  console.error('build-sw: out/sw.js not found — run `next build` first.');
  process.exit(1);
}

const paths = (await walk(outDir))
  .map((full) => relative(outDir, full).split(sep).join('/'))
  .filter(belongs)
  .sort();

const hash = createHash('sha256');
for (const path of paths) {
  hash.update(path);
  hash.update(await readFile(join(outDir, path)));
}

const build = {
  version: hash.digest('hex').slice(0, 12),
  precache: paths.map(toUrl),
};

if (!build.precache.includes('/offline/')) {
  // The worker falls back to this page; without it an offline navigation to
  // an unknown URL is the browser's own error screen.
  console.error('build-sw: the /offline/ page is missing from the export.');
  process.exit(1);
}

const source = await readFile(workerPath, 'utf8');
if (!MARKER.test(source)) {
  console.error('build-sw: the `// __SW_BUILD__` line is missing from sw.js.');
  process.exit(1);
}

await writeFile(
  workerPath,
  source.replace(MARKER, () => `const BUILD = ${JSON.stringify(build)}; // __SW_BUILD__`),
);

console.log(`build-sw: ${String(build.precache.length)} files, version ${build.version}`);
