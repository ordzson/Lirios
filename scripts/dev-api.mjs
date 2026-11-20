// Local stand-in for Vercel Functions. `ng serve` does not serve `api/*`, so this
// mounts every `api/**/*.ts` handler (they export `{ fetch(request) }`) on
// http://127.0.0.1:4310 and `proxy.conf.json` forwards `/api` here.
//
// Run with tsx (handlers import `.js` specifiers that are `.ts` files):
//   pnpm run dev:api            (tsx watch: restarts when a handler or server/* changes)
//
// Environment comes from `.env.local` (gitignored). Routes are resolved per
// request, so a new handler file works without restarting:
//   /api/health        → api/health.ts
//   /api/uploads/sign  → api/uploads/sign.ts
//   /api/media         → api/media.ts or api/media/index.ts
//   /api/orders/abc    → api/orders/[id].ts (one dynamic segment per level)
import { existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'api');
const envFile = join(root, '.env.local');
const host = process.env.DEV_API_HOST ?? '127.0.0.1';
const port = Number(process.env.DEV_API_PORT ?? 4310);
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const SEGMENT = /^[A-Za-z0-9._-]+$/;

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
} else {
  console.warn('[dev-api] .env.local not found: handlers run without local env.');
}

function isHandlerFile(name) {
  return name.endsWith('.ts') && !name.endsWith('.d.ts') && !/\.(test|spec)\.ts$/.test(name);
}

function listHandlers(dir = apiDir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listHandlers(full);
    return isHandlerFile(name) ? [full] : [];
  });
}

function routeOf(file) {
  const rel = relative(apiDir, file).split(sep).join('/').replace(/\.ts$/, '');
  return '/api/' + rel.replace(/(^|\/)index$/, '');
}

function dynamicEntry(dir, wantDirectory) {
  if (!existsSync(dir)) return null;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const isDir = statSync(full).isDirectory();
    if (wantDirectory && isDir && /^\[[^\]]+\]$/.test(name)) return full;
    if (!wantDirectory && !isDir && /^\[[^\]]+\]\.ts$/.test(name)) return full;
  }
  return null;
}

// Maps a URL path to a handler file, or null.
function resolveHandler(pathname) {
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  if (segments.some((segment) => !SEGMENT.test(segment) || segment.startsWith('.'))) return null;

  let dir = apiDir;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = decodeURIComponent(segments[i]);
    const last = i === segments.length - 1;
    if (last) {
      const file = join(dir, `${segment}.ts`);
      if (existsSync(file) && isHandlerFile(file)) return file;
      const index = join(dir, segment, 'index.ts');
      if (existsSync(index)) return index;
      const dynamicFile = dynamicEntry(dir, false);
      if (dynamicFile) return dynamicFile;
      const dynamicDir = dynamicEntry(dir, true);
      if (dynamicDir && existsSync(join(dynamicDir, 'index.ts'))) return join(dynamicDir, 'index.ts');
      return null;
    }
    const next = join(dir, segment);
    if (existsSync(next) && statSync(next).isDirectory()) {
      dir = next;
      continue;
    }
    const dynamicDir = dynamicEntry(dir, true);
    if (!dynamicDir) return null;
    dir = dynamicDir;
  }
  const index = join(dir, 'index.ts');
  return segments.length > 0 && existsSync(index) ? index : null;
}

// Supports `export default { fetch }`, `export default function`, and named
// method exports (`export function GET(request)`), as Vercel does.
function pickHandler(mod, method) {
  const def = mod.default;
  if (def && typeof def.fetch === 'function') return (request) => def.fetch(request);
  if (typeof def === 'function') return def;
  if (typeof mod[method] === 'function') return mod[method];
  if (method === 'HEAD' && typeof mod.GET === 'function') return mod.GET;
  return null;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function toRequest(req, body) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && body !== undefined;
  return new Request(url, { method: req.method, headers, body: hasBody ? body : undefined });
}

async function sendResponse(res, response, method) {
  const headers = {};
  response.headers.forEach((value, name) => {
    if (name === 'set-cookie') return;
    headers[name] = value;
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) headers['set-cookie'] = cookies;
  res.writeHead(response.status, response.statusText, headers);
  if (method === 'HEAD' || response.body === null) {
    res.end();
    return;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const method = (req.method ?? 'GET').toUpperCase();
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    if (!pathname.startsWith('/api/') && pathname !== '/api') {
      sendJson(res, 404, { error: 'Ruta no encontrada.' });
      return;
    }
    const file = resolveHandler(pathname);
    if (!file) {
      sendJson(res, 404, { error: 'Ruta no encontrada.' });
      return;
    }
    const mod = await import(pathToFileURL(file).href);
    const handler = pickHandler(mod, method);
    if (!handler) {
      res.setHeader('allow', METHODS.filter((m) => typeof mod[m] === 'function').join(', '));
      sendJson(res, 405, { error: 'Método no permitido.' });
      return;
    }
    const request = toRequest(req, await readBody(req));
    const response = await handler(request);
    if (!(response instanceof Response)) throw new Error(`${routeOf(file)} did not return a Response`);
    await sendResponse(res, response, method);
  } catch (error) {
    console.error(`[dev-api] ${method} ${pathname} failed:`, error);
    if (!res.headersSent) sendJson(res, 500, { error: 'No pudimos completar la solicitud.' });
    else res.end();
  } finally {
    console.log(`[dev-api] ${method} ${pathname} → ${res.statusCode} (${Date.now() - started} ms)`);
  }
});

server.on('error', (error) => {
  console.error(`[dev-api] could not listen on ${host}:${port}:`, error.message);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`[dev-api] listening on http://${host}:${port}`);
  for (const file of listHandlers()) console.log(`[dev-api]   ${routeOf(file)}  ←  ${relative(root, file)}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  });
}
