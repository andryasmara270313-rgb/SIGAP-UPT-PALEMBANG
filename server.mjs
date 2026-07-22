import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const snapshotRoot = path.join(root, 'snapshot');
const publicRoot = path.join(root, 'public');
const port = Number(process.env.PORT || 8080);
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const maptilerKey = process.env.MAPTILER_KEY || '';
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set; sessions will be invalidated after every restart.');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('ADMIN_PASSWORD is not set; the temporary default password is active.');
}

const appRoutes = new Set([
  '/dashboard',
  '/analisa-petir',
  '/analisa',
  '/data',
  '/laporan',
  '/master/gi',
  '/master/rekap-gangguan',
  '/master/segment',
  '/master/teg-induksi',
  '/master/tower',
  '/pengaturan',
  '/peta-transmisi'
]);

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
}

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  applySecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

function redirect(res, location, status = 303) {
  applySecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Location', location);
  res.end();
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const index = value.indexOf('=');
        return index === -1
          ? [value, '']
          : [value.slice(0, index), decodeURIComponent(value.slice(index + 1))];
      })
  );
}

function sign(value) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function createSessionToken(hours) {
  const payload = Buffer.from(
    JSON.stringify({ username: adminUsername, expiresAt: Date.now() + hours * 60 * 60 * 1000 })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function validSession(req) {
  const token = parseCookies(req.headers.cookie).sigerlyzer_session;
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.username === adminUsername && Number(data.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

function equalCredential(received, expected) {
  const left = createHash('sha256').update(received).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

async function readBody(req, limit = 10_240) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function safeJoin(base, relativePath) {
  const resolved = path.resolve(base, relativePath);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) return null;
  return resolved;
}

async function serveFile(res, file, cacheControl = 'no-store') {
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    applySecurityHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    res.setHeader('Cache-Control', cacheControl);
    createReadStream(file).pipe(res);
  } catch {
    send(res, 404, 'File not found');
  }
}

async function serveLogin(req, res, url) {
  if (validSession(req)) return redirect(res, '/dashboard');
  let html = await readFile(path.join(publicRoot, 'login.html'), 'utf8');
  const error = url.searchParams.has('error')
    ? '<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Username atau password salah.</div>'
    : '';
  html = html.replace('{{ERROR}}', error);
  send(res, 200, html, 'text/html; charset=utf-8');
}

async function serveAppPage(res, route) {
  const routeName = route.slice(1);
  const file = safeJoin(path.join(snapshotRoot, 'pages'), path.join(routeName, 'index.html'));
  if (!file) return send(res, 400, 'Invalid route');
  try {
    let html = await readFile(file, 'utf8');
    html = html.replace('</body>', '<script src="/static/readonly.js"></script></body>');
    send(res, 200, html, 'text/html; charset=utf-8');
  } catch {
    send(res, 404, 'Page not found');
  }
}

async function serveRouteData(res, route) {
  const routeName = route.slice(1);
  const file = safeJoin(path.join(snapshotRoot, 'route-data'), path.join(routeName, '__data.json'));
  if (!file) return send(res, 400, 'Invalid route');
  return serveFile(res, file, 'private, no-store');
}

async function serveBuildAsset(res, pathname) {
  const relative = pathname.replace(/^\/_app\//, '');
  const file = safeJoin(path.join(snapshotRoot, '_app'), relative);
  if (!file) return send(res, 400, 'Invalid asset path');

  if (pathname.endsWith('/nodes/16.Co4mZT-X.js')) {
    try {
      let javascript = await readFile(file, 'utf8');
      javascript = javascript.replaceAll('__MAPTILER_KEY__', maptilerKey);
      return send(res, 200, javascript, 'text/javascript; charset=utf-8');
    } catch {
      return send(res, 404, 'Asset not found');
    }
  }

  return serveFile(res, file, 'public, max-age=31536000, immutable');
}

function requireSession(req, res, expectsJson = false) {
  if (validSession(req)) return true;
  if (expectsJson) send(res, 401, JSON.stringify({ error: 'Unauthorized' }), 'application/json; charset=utf-8');
  else redirect(res, '/login', 302);
  return false;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname.length > 1 && pathname.endsWith('/') && !pathname.endsWith('/__data.json')) {
      return redirect(res, pathname.slice(0, -1) + url.search, 308);
    }

    if (req.method === 'GET' && pathname === '/health') {
      return send(res, 200, JSON.stringify({ status: 'ok', mode: 'sanitized-read-only-snapshot' }), 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && pathname === '/_app/version.json') {
      return send(res, 200, JSON.stringify({ version: '1784528926765' }), 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && pathname.startsWith('/_app/')) {
      return serveBuildAsset(res, pathname);
    }

    if (req.method === 'GET' && pathname === '/favicon.jpeg') {
      return serveFile(res, path.join(snapshotRoot, 'favicon.jpeg'), 'public, max-age=86400');
    }

    if (req.method === 'GET' && pathname === '/static/readonly.js') {
      return serveFile(res, path.join(publicRoot, 'readonly.js'), 'public, max-age=300');
    }

    if (req.method === 'GET' && pathname === '/login') {
      return serveLogin(req, res, url);
    }

    if (req.method === 'POST' && pathname === '/login') {
      const body = new URLSearchParams(await readBody(req));
      const username = body.get('username') || '';
      const password = body.get('password') || '';
      if (!equalCredential(username, adminUsername) || !equalCredential(password, adminPassword)) {
        return redirect(res, '/login?error=1');
      }

      const remember = body.get('rememberMe') === 'on';
      const hours = remember ? 24 : 8;
      const secure = req.headers['x-forwarded-proto'] === 'https';
      const cookie = [
        `sigerlyzer_session=${encodeURIComponent(createSessionToken(hours))}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${hours * 60 * 60}`,
        secure ? 'Secure' : ''
      ].filter(Boolean).join('; ');
      res.setHeader('Set-Cookie', cookie);
      return redirect(res, '/dashboard');
    }

    if ((req.method === 'POST' || req.method === 'GET') && pathname === '/logout') {
      res.setHeader('Set-Cookie', 'sigerlyzer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return redirect(res, '/login');
    }

    if (pathname === '/tunnel-test') {
      return send(res, 404, 'Route disabled');
    }

    if (req.method === 'GET' && pathname === '/') {
      return redirect(res, validSession(req) ? '/dashboard' : '/login', 302);
    }

    if (req.method === 'GET' && pathname === '/segment') {
      if (!requireSession(req, res)) return;
      return redirect(res, '/master/segment', 302);
    }

    if (req.method === 'GET' && pathname.endsWith('/__data.json')) {
      const route = pathname.slice(0, -'/__data.json'.length) || '/';
      if (!appRoutes.has(route)) return send(res, 404, JSON.stringify({ error: 'Route not found' }), 'application/json; charset=utf-8');
      if (!requireSession(req, res, true)) return;
      return serveRouteData(res, route);
    }

    if (req.method === 'GET' && pathname.startsWith('/api/towers/search')) {
      if (!requireSession(req, res, true)) return;
      return send(res, 200, '[]', 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && pathname.startsWith('/api/teg-induksi/bay/')) {
      if (!requireSession(req, res, true)) return;
      return send(res, 200, '[]', 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && appRoutes.has(pathname)) {
      if (!requireSession(req, res)) return;
      return serveAppPage(res, pathname);
    }

    if (req.method === 'POST' && appRoutes.has(pathname)) {
      if (!requireSession(req, res, true)) return;
      return send(
        res,
        423,
        JSON.stringify({ error: 'This recovered production snapshot is read-only. Server action source code was not exposed by the original deployment.' }),
        'application/json; charset=utf-8'
      );
    }

    return send(res, 404, 'Not found');
  } catch (error) {
    console.error(error);
    return send(res, 500, 'Internal server error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`SIGERLYZER snapshot listening on http://0.0.0.0:${port}`);
});
