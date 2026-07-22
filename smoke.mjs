import { spawn } from 'node:child_process';

const port = 18080;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'admin123',
    SESSION_SECRET: 'test-session-secret-12345678901234567890',
    MAPTILER_KEY: 'test-map-key'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

const started = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
  child.once('error', reject);
  child.stdout.on('data', (chunk) => {
    if (chunk.toString().includes('SIGERLYZER snapshot listening')) {
      clearTimeout(timer);
      resolve();
    }
  });
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
});

function assert(value, message) {
  if (!value) throw new Error(message);
}

try {
  await started;

  const unauthorized = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  assert(unauthorized.status === 302, 'Protected dashboard did not return HTTP 302');
  assert(unauthorized.headers.get('location') === '/login', 'Protected dashboard did not redirect to login');

  const login = await fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123', rememberMe: 'on' })
  });
  assert(login.status === 303, 'Valid login did not return HTTP 303');
  assert(login.headers.get('location') === '/dashboard', 'Valid login did not redirect to dashboard');
  const cookie = (login.headers.get('set-cookie') || '').split(';', 1)[0];
  assert(cookie.startsWith('sigerlyzer_session='), 'Valid login did not issue a session cookie');

  const dashboard = await fetch(`${base}/dashboard`, { headers: { cookie } });
  const dashboardHtml = await dashboard.text();
  assert(dashboard.status === 200, 'Authenticated dashboard did not return HTTP 200');
  assert(dashboardHtml.includes('Total Gangguan'), 'Dashboard content is missing');
  assert(dashboardHtml.includes('/static/readonly.js'), 'Read-only safeguard was not injected');

  const routeData = await fetch(`${base}/dashboard/__data.json`, { headers: { cookie } });
  const routeDataText = await routeData.text();
  assert(routeData.status === 200, 'Dashboard route data did not return HTTP 200');
  assert(routeDataText.includes('REDACTED_PASSWORD_HASH'), 'Password hash was not redacted');
  assert(!/[0-9a-fA-F]{32}:[0-9a-fA-F]{64}/.test(routeDataText), 'Credential hash remains in dashboard route data');

  const mapNode = await fetch(`${base}/_app/immutable/nodes/16.Co4mZT-X.js`);
  const mapNodeText = await mapNode.text();
  assert(mapNode.status === 200, 'Map JavaScript asset did not return HTTP 200');
  assert(mapNodeText.includes('test-map-key'), 'Runtime MapTiler key was not injected');

  const health = await fetch(`${base}/health`);
  assert(health.status === 200, 'Health endpoint did not return HTTP 200');
  assert((await health.json()).status === 'ok', 'Health endpoint payload is invalid');

  console.log('Smoke test passed: auth, dashboard, route data, assets, sanitization, and health are working.');
} finally {
  child.kill('SIGTERM');
}
