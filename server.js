require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
if (!JWT_SECRET || !DATABASE_URL) {
  console.error('JWT_SECRET dan DATABASE_URL wajib diisi. Salin .env.example menjadi .env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}
function setAuthCookie(res, token, remember = false) {
  res.cookie('sigap_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
    path: '/',
  });
}
function requireAuth(req, res, next) {
  const token = req.cookies.sigap_session;
  if (!token) return res.status(401).json({ error: 'Belum login' });
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); }
  catch { return res.status(401).json({ error: 'Sesi tidak valid atau kedaluwarsa' }); }
}
function requirePageAuth(req, res, next) {
  const token = req.cookies.sigap_session;
  try { jwt.verify(token, JWT_SECRET); return next(); }
  catch { return res.redirect('/login.html'); }
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(80) UNIQUE NOT NULL,
      name VARCHAR(160) NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'user',
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS app_records (
      id BIGSERIAL PRIMARY KEY,
      record_type VARCHAR(80) NOT NULL,
      record_key VARCHAR(160) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(record_type, record_key)
    );
    CREATE INDEX IF NOT EXISTS idx_app_records_type ON app_records(record_type);
  `);
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) throw new Error('ADMIN_PASSWORD wajib diisi untuk membuat admin pertama.');
  const exists = await pool.query('SELECT id FROM users WHERE username=$1', [adminUser]);
  if (!exists.rowCount) {
    const hash = await bcrypt.hash(adminPass, 12);
    await pool.query('INSERT INTO users(username,name,role,password_hash) VALUES($1,$2,$3,$4)', [adminUser, process.env.ADMIN_NAME || 'Administrator', 'admin', hash]);
    console.log(`Admin awal dibuat: ${adminUser}`);
  }
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected', time: new Date().toISOString() }); }
  catch { res.status(503).json({ ok: false, database: 'disconnected' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const remember = Boolean(req.body.remember);
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });
  const result = await pool.query('SELECT * FROM users WHERE username=$1 AND is_active=TRUE', [username]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Username atau password salah' });
  setAuthCookie(res, issueToken(user), remember);
  res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('sigap_session', { path: '/' }); res.json({ ok: true }); });
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/records/:type', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT record_key,payload,updated_at FROM app_records WHERE record_type=$1 ORDER BY record_key', [req.params.type]);
  res.json({ records: result.rows });
});
app.put('/api/records/:type/:key', requireAuth, async (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const result = await pool.query(`INSERT INTO app_records(record_type,record_key,payload,created_by)
    VALUES($1,$2,$3,$4) ON CONFLICT(record_type,record_key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()
    RETURNING record_key,payload,updated_at`, [req.params.type, req.params.key, payload, req.user.sub]);
  res.json(result.rows[0]);
});
app.delete('/api/records/:type/:key', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM app_records WHERE record_type=$1 AND record_key=$2', [req.params.type, req.params.key]);
  res.json({ ok: true });
});

app.get('/', (req, res) => res.redirect('/login.html'));
app.use('/dashboard.html', requirePageAuth);
app.use('/pages', requirePageAuth);
app.use(express.static(__dirname, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Terjadi kesalahan server' }); });

initDatabase().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`SIGAP aktif pada port ${PORT}`))).catch(err => { console.error(err); process.exit(1); });
