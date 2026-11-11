/**
 * Serves dist/ under /play exactly as Netlify will, so the service worker
 * scope, manifest paths and offline fallback can be tested locally.
 *   npm run build:web && npm run preview:web  ->  http://localhost:4173/play/
 * No dependencies on purpose.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('dist');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.css': 'text/css',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/play') {
    res.writeHead(302, { Location: '/play/' }).end();
    return;
  }
  if (!url.pathname.startsWith('/play/')) {
    res.writeHead(404).end('Not found');
    return;
  }
  const rel = normalize(decodeURIComponent(url.pathname.slice('/play/'.length)));
  let file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, 'index.html');
  }
  try {
    const body = await readFile(file);
    const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
    if (file.endsWith('sw.js') || file.endsWith('.html')) headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Sumday web preview: http://localhost:${PORT}/play/`));
