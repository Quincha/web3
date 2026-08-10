import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  countUsers, createUser, getUserByUsername, verifyPassword,
  createSession, destroySession, getUserByToken,
  getConfig, saveConfig, putStore, getAllStore,
  getStoreSince, pruneStore, updatePassword, pruneExpiredSessions,
} from './db.js';
import {
  gcalConfigured, buildAuthUrl, exchangeCodeForTokens,
  gcalSaveTokens, gcalGetTokens, gcalClearTokens,
  gcalListEvents, gcalCreateEvent, gcalUpdateEvent, gcalDeleteEvent, gcalClearEvents,
  gcalEnsureWatch, gcalStopWatch, gcalChannelValid,
} from './gcal.js';

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
// Rate limiting (en memoria, sin dependencias) — protege login/install de
// fuerza bruta y limita avisos del webhook.
// --------------------------------------------------------------------------
const rateBucketDefaults = new Map(); // key -> { count, resetAt }
export const rateBuckets = rateBucketDefaults;

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const hit = rateBuckets.get(key);
  if (!hit || hit.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  hit.count += 1;
  return { allowed: hit.count <= max, remaining: Math.max(0, max - hit.count) };
}

function rateLimitGuard(max, windowMs) {
  return (req, res, next) => {
    const ip = clientIp(req);
    const verdict = rateLimit(`${ip}:${req.path}`, max, windowMs);
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' });
    }
    next();
  };
}

// Limpia de vez en cuando las entradas de rate limit y nonces vencidos.
const WEBHOOK_RATE_MAX = 60;
const WEBHOOK_RATE_WINDOW_MS = 60 * 1000;

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
app.post('/api/install', rateLimitGuard(5, 10 * 60 * 1000), (req, res) => {
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
app.post('/api/login', rateLimitGuard(5, 10 * 60 * 1000), (req, res) => {
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
// Cambio de contraseña (sesión activa requerida)
// --------------------------------------------------------------------------
app.post('/api/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (typeof current !== 'string' || typeof next !== 'string') {
    return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
  }
  if (!verifyPassword(current, req.user.password_hash)) {
    return res.status(403).json({ error: 'Contraseña actual incorrecta' });
  }
  if (next.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }
  if (next === current) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual' });
  }
  updatePassword(req.user.username, next);
  res.json({ ok: true });
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
const SYNC_EVENT_TTL_MS = 24 * 60 * 60 * 1000; // cola de sync_event:* con más de un día, se purga

app.post('/api/sync', requireAuth, (req, res) => {
  const entries = (req.body && (req.body.entries ?? req.body)) || [];
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Se esperaba un array de entradas' });
  }
  const changed = [];
  for (const entry of entries) {
    if (!entry || typeof entry.key !== 'string') continue;
    const data = entry.data !== undefined ? JSON.stringify(entry.data) : 'null';
    const ts = Number(entry.updatedAt) || Date.now();
    putStore(req.user.id, entry.key, data, ts);
    changed.push({ key: entry.key, data: entry.data !== undefined ? entry.data : null, updatedAt: ts });
  }
  // Limpia los eventos de la cola de sync más viejos que un día (no crecen ilimitados).
  pruneStore(req.user.id, 'sync_event:', Date.now() - SYNC_EVENT_TTL_MS);
  res.json({ ok: true, db: changed });
});

app.get('/api/sync', requireAuth, (req, res) => {
  const since = Number(req.query.since);
  const rows = Number.isFinite(since) && since > 0
    ? getStoreSince(req.user.id, since)
    : getAllStore(req.user.id);
  res.json({
    ok: true,
    db: rows.map((r) => ({ key: r.key, data: JSON.parse(r.data), updatedAt: r.updated_at })),
    since: Number.isFinite(since) && since > 0 ? since : null,
  });
});

// --------------------------------------------------------------------------
// Google Calendar OAuth + sync
// --------------------------------------------------------------------------

// Estado OAuth en memoria (state -> userId). Al reiniciar el server se invalida;
// el usuario debe repetir "Conectar" si el server se reinició a mitad del flujo.
const oauthStates = new Map();

app.get('/api/gcal/status', requireAuth, (_req, res) => {
  const configured = gcalConfigured();
  const token = gcalGetTokens(_req.user.id);
  res.json({
    configured,
    connected: Boolean(token && token.refresh_token),
    profile: token ? { email: token.scope && token.cal_name } : null,
    calName: token?.cal_name || null,
  });
});

app.get('/api/gcal/auth', requireAuth, (_req, res) => {
  if (!gcalConfigured()) {
    return res.status(503).json({ error: 'Google Calendar no configurado en el servidor (faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)' });
  }
  // state vincula el callback con el userId (sin exponer el token de sesión)
  const state = crypto.randomBytes(24).toString('hex');
  oauthStates.set(state, { userId: _req.user.id, createdAt: Date.now() });
  res.json({ url: buildAuthUrl(state) });
});

app.get('/api/gcal/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect('/?gcal=error');
  const codeStr = String(code || '');
  const entry = oauthStates.get(String(state));
  oauthStates.delete(String(state));
  if (!entry || !entry.userId) return res.status(400).send('Sesión de Google Calendar expirada. Vuelve a Ajustes y conecta de nuevo.');

  if (!codeStr) return res.status(400).send('Falta el código de autorización');

  try {
    const tokens = await exchangeCodeForTokens(codeStr);
    const expiresAt = Date.now() + Number(tokens.expires_in || 3600) * 1000;
    gcalSaveTokens(entry.userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      cal_id: 'primary',
      cal_name: 'Quincha',
    });
    res.redirect('/?gcal=ok');
  } catch (err) {
    console.error('[gcal] callback error:', err);
    res.redirect('/?gcal=error');
  }
});

app.post('/api/gcal/disconnect', requireAuth, async (req, res) => {
  try { await gcalStopWatch(req.user.id); } catch { /* sin canal */ }
  gcalClearTokens(req.user.id);
  res.json({ ok: true });
});

// --------------------------------------------------------------------------
// Push notifications de Google Calendar (Watch webhook -> SSE)
// --------------------------------------------------------------------------

// Employee streams: userId -> Set<Response>
const gcalClients = new Map();

function gcalNotify(userId, payload) {
  const set = gcalClients.get(userId);
  if (!set) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of Array.from(set)) {
    try { res.write(data); } catch { set.delete(res); }
  }
}

// Nonces de un solo uso para el SSE: como EventSource no puede enviar el header
// Authorization, el navegador pide primero un ticket corto con su sesión y luego
// abre el stream con ese nonce (no expone el token de sesión en la URL/logs).
const sseNonces = new Map(); // nonce -> { token, expiresAt }
const NONCE_TTL_MS = 30 * 1000;

app.post('/api/gcal/streamticket', requireAuth, (_req, res) => {
  const nonce = crypto.randomBytes(24).toString('hex');
  sseNonces.set(nonce, { token: _req.token, expiresAt: Date.now() + NONCE_TTL_MS });
  res.json({ nonce });
});

app.get('/api/gcal/stream', (req, res) => {
  const nonce = String(req.query.nonce || '');
  const entry = sseNonces.get(nonce);
  sseNonces.delete(nonce); // de un solo uso
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const user = getUserByToken(entry.token);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  let set = gcalClients.get(user.id);
  if (!set) { set = new Set(); gcalClients.set(user.id, set); }
  set.add(res);
  res.write(`retry: 15000\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);

  // Mantener vivo el canal de push mientras alguien mira la app.
  gcalEnsureWatch(user.id).catch((err) => console.error('[gcal] ensureWatch:', err.message));

  const heartbeat = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { cleanup(); }
  }, 25000);

  function cleanup() {
    clearInterval(heartbeat);
    const s = gcalClients.get(user.id);
    if (s) {
      s.delete(res);
      if (s.size === 0) gcalClients.delete(user.id);
    }
  }
  res.on('close', cleanup);
  res.on('error', cleanup);
});

// Recibe los avisos de Google Calendar. Siempre responde 200 rápido y luego
// avisa a los navegadores conectados (SSE) SOLO si el canal coincide con el que
// creamos para ese usuario (cualquier otro aviso se ignora, no hay refrescos
// falsos ni spameables). Validamos el source con X-Goog-Channel-ID/Resource-ID.
app.post('/api/gcal/webhook', rateLimitGuard(WEBHOOK_RATE_MAX, WEBHOOK_RATE_WINDOW_MS), (req, res) => {
  const channelToken = String(req.headers['x-goog-channel-token'] || '');
  const state = String(req.headers['x-goog-resource-state'] || '');
  const channelId = String(req.headers['x-goog-channel-id'] || '');
  const resourceId = String(req.headers['x-goog-resource-id'] || '');
  res.status(200).end();

  const m = /^gcal_(\d+)$/.exec(channelToken);
  if (!m) return;
  const userId = Number(m[1]);
  // Si el canal no es el nuestro (o viene sin el channel-id correcto), ignorar.
  if (!gcalChannelValid(userId, channelId, resourceId)) return;
  if (state === 'sync') return; // solo inicial, no es un cambio real
  console.log(`[webhook] valid refresh userId=${userId}`);
  gcalNotify(userId, { type: 'refresh' });
});

// Renueva los canales de push de los usuarios con la app abierta (el TTL del
// canal es de ~6h; lo renovamos cada 10 min para nunca perder notificaciones).
setInterval(() => {
  for (const userId of Array.from(gcalClients.keys())) {
    gcalEnsureWatch(userId).catch((err) => console.error('[gcal] renew:', err.message));
  }
}, 10 * 60 * 1000);

// Limpieza periódica: sesiones expiradas, rate limits viejos, nonces y estados
// OAuth vencidos (evita que el mapa en memoria crezca sin límite).
setInterval(() => {
  const now = Date.now();
  pruneExpiredSessions();
  for (const [key, hit] of rateBuckets) {
    if (hit.resetAt <= now) rateBuckets.delete(key);
  }
  for (const [nonce, entry] of sseNonces) {
    if (entry.expiresAt < now) sseNonces.delete(nonce);
  }
  for (const [key, entry] of oauthStates) {
    if (now - entry.createdAt > 15 * 60 * 1000) oauthStates.delete(key);
  }
}, 5 * 60 * 1000);
pruneExpiredSessions();

// Importar eventos de Google (para unirlos al calendario local)
app.get('/api/gcal/events', requireAuth, async (req, res) => {
  const days = Math.min(Number(req.query.days) || 60, 365);
  const now = new Date();
  const min = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const max = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const configured = gcalConfigured();
  const hasTok = Boolean(gcalGetTokens(req.user.id)?.refresh_token);

  if (!configured || !hasTok) return res.json({ ok: true, connected: false, items: [] });

  try {
    const items = await gcalListEvents(req.user.id, min, max);
    // Activa (o renueva) el canal de push para recibir cambios en tiempo real.
    gcalEnsureWatch(req.user.id).catch((err) => console.error('[gcal] ensureWatch:', err.message));
    res.json({ ok: true, connected: true, items });
  } catch (err) {
    if (err.status === 401) {
      gcalClearTokens(req.user.id);
      return res.json({ ok: true, connected: false, items: [], error: 'Sesión revocada' });
    }
    console.error('[gcal] list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Exporta un evento desde Quincha hacia Google Calendar
// Google necesita una zona horaria en los dateTime; sin ella devuelve 400
// "Missing time zone definition for start time". Si el cliente no la manda,
// usamos la del servidor como respaldo.
const gcalTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago';

app.post('/api/gcal/event', requireAuth, async (req, res) => {
  const { summary, start, end, allDay, description, location, timeZone } = req.body || {};
  if (!gcalConfigured() || !gcalGetTokens(req.user.id)?.refresh_token) {
    return res.status(503).json({ error: 'Google Calendar no conectado' });
  }
  if (!summary || !start) return res.status(400).json({ error: 'Faltan summary/start' });

  try {
    const payload = {
      summary,
      description: description || '',
      location: location || '',
    };
    if (allDay) {
      payload.start = { date: String(start).slice(0, 10) };
      payload.end = { date: String(end || start).slice(0, 10) };
    } else {
      payload.start = { dateTime: start, timeZone: timeZone || gcalTimeZone() };
      payload.end = { dateTime: end || start, timeZone: timeZone || gcalTimeZone() };
    }
    const created = await gcalCreateEvent(req.user.id, payload);
    res.json({ ok: true, id: created.id });
  } catch (err) {
    console.error('[gcal] create:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gcal/clear', requireAuth, async (req, res) => {
  if (!gcalConfigured()) return res.status(503).json({ error: 'Google Calendar no configurado' });
  const removed = await gcalClearEvents(req.user.id, String(req.body?.prefix || ''));
  res.json({ ok: true, removed });
});

// Mover / reagendar un evento (drag & drop)
app.patch('/api/gcal/event/:eventId', requireAuth, async (req, res) => {
  if (!gcalConfigured() || !gcalGetTokens(req.user.id)?.refresh_token) {
    return res.status(503).json({ error: 'Google Calendar no conectado' });
  }
  const { start, end } = req.body || {};
  if (!start) return res.status(400).json({ error: 'Falta start' });
  try {
    const payload = {};
    const tz = req.body?.timeZone || gcalTimeZone();
    if (req.body?.allDay) {
      payload.summary = req.body.summary;
      payload.start = { date: String(start).slice(0, 10) };
      payload.end = { date: String(end || start).slice(0, 10) };
    } else {
      payload.start = { dateTime: start, timeZone: tz };
      payload.end = { dateTime: end || start, timeZone: tz };
    }
    const updated = await gcalUpdateEvent(req.user.id, String(req.params.eventId), payload);
    res.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error('[gcal] patch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Borrar un evento de Google
app.delete('/api/gcal/event/:eventId', requireAuth, async (req, res) => {
  if (!gcalConfigured() || !gcalGetTokens(req.user.id)?.refresh_token) {
    return res.status(503).json({ error: 'Google Calendar no conectado' });
  }
  try {
    await gcalDeleteEvent(req.user.id, String(req.params.eventId));
    res.json({ ok: true });
  } catch (err) {
    console.error('[gcal] delete:', err);
    res.status(500).json({ error: err.message });
  }
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