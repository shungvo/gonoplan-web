#!/usr/bin/env node
/**
 * Serves the static build the way the host does: files from `out/`, and
 * `/api/v1/*` forwarded to the API.
 *
 * A static export has no rewrites, so `python -m http.server` over `out/`
 * leaves the app with no same-origin API — and a session that cannot survive
 * a reload, which is exactly the bug the hosted proxy exists to prevent. This
 * reproduces what `vercel.json` does in production, so a built app can be
 * tested locally on the same path it takes there:
 *
 *   - the browser only ever talks to this origin, so the refresh cookie is
 *     first-party;
 *   - the visitor's address goes upstream in `x-real-ip`, overwriting anything
 *     the browser sent, as Vercel does;
 *   - `x-gonoplan-proxy` carries GONOPLAN_PROXY_SECRET when it is set, so the
 *     API can trust that address (its PROXY_SECRET must match).
 *
 * Usage:
 *   npm run build
 *   GONOPLAN_PROXY_SECRET=… node scripts/serve-out.mjs   # http://localhost:4173
 *
 * Environment: PORT (4173), API_INTERNAL_URL (http://localhost:4000),
 * GONOPLAN_PROXY_SECRET (optional).
 *
 * Development tooling only. No dependencies, no caching, no compression.
 */
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)), 'out');
const port = Number(process.env.PORT ?? 4173);
const api = new URL(process.env.API_INTERNAL_URL ?? 'http://localhost:4000');
const secret = process.env.GONOPLAN_PROXY_SECRET ?? '';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

if (!existsSync(root)) {
  console.error('serve-out: no out/ folder — run `npm run build` first.');
  process.exit(1);
}

/** The visitor, as the host would see them. IPv4-mapped IPv6 is unwrapped. */
function visitorAddress(req) {
  const address = req.socket.remoteAddress ?? '';
  return address.startsWith('::ffff:') ? address.slice(7) : address;
}

function proxy(req, res) {
  const headers = { ...req.headers, host: api.host };
  // What Vercel guarantees: the visitor's address, never one the visitor wrote.
  delete headers['x-forwarded-for'];
  headers['x-real-ip'] = visitorAddress(req);
  headers['x-forwarded-proto'] = 'http';
  headers['x-forwarded-host'] = req.headers.host ?? '';
  if (secret) headers['x-gonoplan-proxy'] = secret;
  else delete headers['x-gonoplan-proxy'];

  const send = api.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = send(
    {
      protocol: api.protocol,
      hostname: api.hostname,
      port: api.port,
      method: req.method,
      path: req.url,
      headers,
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );
  upstream.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`serve-out: API unreachable at ${api.origin} (${error.message})`);
  });
  req.pipe(upstream);
}

/** `out/` is built with trailing slashes: `/explore` and `/explore/` are `explore/index.html`. */
function fileFor(pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = normalize(join(root, decoded));
  if (target !== root && !target.startsWith(root + sep)) return null;

  for (const candidate of [target, join(target, 'index.html'), `${target}.html`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');

  if (pathname.startsWith('/api/v1/')) {
    proxy(req, res);
    return;
  }

  const file = fileFor(pathname) ?? join(root, '404.html');
  const status = fileFor(pathname) ? 200 : 404;
  res.writeHead(status, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // The service worker must never be cached, as on the host.
    ...(pathname === '/sw.js' ? { 'cache-control': 'no-cache, no-store, must-revalidate' } : {}),
  });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(
    `serve-out: http://localhost:${String(port)} — out/ plus /api/v1 → ${api.origin}` +
      (secret ? ' (with proxy secret)' : ' (no proxy secret: the API will key on this server)'),
  );
});
