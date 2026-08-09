import { setWorkerUrl } from 'maplibre-gl';

/**
 * Points MapLibre at a worker the browser can actually load.
 *
 * Its default resolution uses `import.meta.url` and bails to an empty string
 * whenever that is not an http(s) URL — which is always true once the code has
 * been through a bundler. No worker means no tile requests at all, and the
 * failure is silent: style, sprite and fonts all load, the canvas initialises,
 * and the map simply stays blank with no error event to catch.
 *
 * `scripts/copy-maplibre-worker.mjs` publishes the file to /public before dev
 * and build.
 */
const WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

let configured = false;

export function ensureMapWorker(): void {
  if (configured) return;
  setWorkerUrl(WORKER_URL);
  configured = true;
}
