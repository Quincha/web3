import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  countUsers, createUser, getUserByUsername, verifyPassword,
  createSession, destroySession, getUserByToken,
  getConfig, saveConfig, putStore, getAllStore,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', '..', 'dist');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

// --------------------------------------------------------------------------
// Auth middleware
// --------------------------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });
  req.user = user;
  req.token = token;
  next();
}

// --------------------------------------------------------------------------
// Health
// --------------------------------------------------------------------------
const startTime = Date.now();
app.get('/api/health', (_req, res) => {
  const setupRequired = countUsers() === 0;
  res.json({
    ok: true,
    setupRequired,
    uptime: Math.round((Date.now() - startTime) / 1000),
    time: new Date().toISOString(),
  });
});

// --------------------------------------------------------------------------
// Installation — create first admin. Only allowed when no users exist.
// --------------------------------------------------------------------------
app.post('/api/install', (req, res) => {
  if (countUsers() !== 0) {
    return res.status(409).json({ error: 'Sistema ya instalado' });
  }
  const { username, password, name = 'Administrador' } = req.body || {};
  const user = String(username || '').trim();
  const pass = String(password || '');

  if (!user || !pass) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }
  if (user.length < 3) return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
  if (pass.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  try {
    createUser(user, pass, 'super-admin', String(name || 'Administrador').trim());
    const token = createSession(getUserByUsername(user).id);
    res.status(201).json({ ok: true, token });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al instalar el sistema' });
  }
});

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }
  const user = getUserByUsername(String(username).trim());
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = createSession(user.id);
  res.json({ ok: true, token, user: { username: user.username, role: user.role, name: user.name } });
});

app.post('/api/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    username: req.user.username,
    role: req.user.role,
    name: req.user.name,
  });
});

// --------------------------------------------------------------------------
// Config per user
// --------------------------------------------------------------------------
app.get('/api/config', requireAuth, (req, res) => {
  const raw = getConfig(req.user.id);
  res.setHeader('Content-Type', 'application/json');
  res.send(raw);
});

app.put('/api/config', requireAuth, (req, res) => {
  const data = JSON.stringify(req.body ?? {});
  saveConfig(req.user.id, data);
  res.json({ ok: true });
});

// --------------------------------------------------------------------------
// Generic key/value store sync (per user)
// --------------------------------------------------------------------------
app.post('/api/sync', requireAuth, (req, res) => {
  const entries = (req.body && (req.body.entries ?? req.body)) || [];
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Se esperaba un array de entradas' });
  }
  for (const entry of entries) {
    if (!entry || typeof entry.key !== 'string') continue;
    const data = entry.data !== undefined ? JSON.stringify(entry.data) : 'null';
    const ts = Number(entry.updatedAt) || Date.now();
    putStore(req.user.id, entry.key, data, ts);
  }
  const result = getAllStore(req.user.id).map((r) => ({ key: r.key, data: JSON.parse(r.data) }));
  res.json({ ok: true, db: result });
});

app.get('/api/sync', requireAuth, (_req, res) => {
  const result = getAllStore(_req.user.id).map((r) => ({ key: r.key, data: JSON.parse(r.data) }));
  res.json({ ok: true, db: result });
});

// --------------------------------------------------------------------------
// Static SPA (dist/) with history fallback
// --------------------------------------------------------------------------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { maxAge: '1h' }));
  app.get(/^(?!.*\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?|json|txt)$).*$/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(503).send('dist/ no existe. Ejecutá `npm run build` en la raíz del proyecto primero.');
  });
}

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));
app.use((err, _req, res, _next) => {
  console.error('[server] Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 3000;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Quincha Systems server on http://localhost:${PORT}`);
  });
}

export { app };