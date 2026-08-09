#!/usr/bin/env node
/**
 * Pulls the API contract into this repo.
 *
 * The two repositories deploy independently, so the web app pins the contract
 * version it was built against rather than reading a moving target. Syncing is
 * therefore an explicit, reviewable commit — you can see in the diff exactly
 * which endpoints changed under you.
 *
 * Sources, in order of preference:
 *   1. CONTRACT_URL           — a deployed API's spec (CI, or a teammate's branch)
 *   2. ../gonoplan-api        — the sibling checkout (normal local development)
 *
 * Usage:
 *   npm run contract:sync
 *   CONTRACT_URL=https://api.gonoplan.com/openapi.json npm run contract:sync
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(repoRoot, 'contracts/openapi.json');
const siblingSpec = resolve(repoRoot, '../gonoplan-api/openapi.json');

async function loadSpec() {
  const url = process.env.CONTRACT_URL;

  if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CONTRACT_URL returned ${response.status} ${response.statusText}`);
    }
    return { source: url, text: await response.text() };
  }

  if (existsSync(siblingSpec)) {
    return { source: siblingSpec, text: await readFile(siblingSpec, 'utf8') };
  }

  throw new Error(
    `No contract source found.\n` +
      `  Checked: ${siblingSpec}\n` +
      `  Set CONTRACT_URL, or check out gonoplan-api alongside this repo and run\n` +
      `  \`npm run openapi:generate\` there first.`,
  );
}

const { source, text } = await loadSpec();

// Parse before writing so a truncated download or an HTML error page cannot
// land in the repo as a "contract".
const spec = JSON.parse(text);
const pathCount = Object.keys(spec.paths ?? {}).length;
if (pathCount === 0) {
  throw new Error('Contract contains no paths — refusing to write.');
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');

console.log(`Synced contract from ${source}`);
console.log(`  → contracts/openapi.json (${pathCount} paths, v${spec.info?.version ?? '?'})`);
console.log(`  Run \`npm run codegen\` to regenerate src/types/api.d.ts`);
