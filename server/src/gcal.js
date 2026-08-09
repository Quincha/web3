import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'quincha.db');
const dataDir = path.dirname(DB_PATH);
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS gcal_tokens (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token  TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at    INTEGER NOT NULL,
    scope         TEXT NOT NULL DEFAULT '',
    cal_id        TEXT NOT NULL DEFAULT 'primary',
    cal_name      TEXT NOT NULL DEFAULT 'Quincha',
    connected_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─────────────────────────────────────────────────────────────
// Config (leída desde variables de entorno, no se commitean)
// ─────────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gcal/callback';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

export function gcalConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

// ── Token storage ─────────────────────────────────────────────────────────
export function gcalGetTokens(userId) {
  return db.prepare('SELECT * FROM gcal_tokens WHERE user_id = ?').get(userId) || null;
}

export function gcalSaveTokens(userId, { access_token, refresh_token, expires_at, scope, cal_id, cal_name }) {
  db.prepare(`
    INSERT INTO gcal_tokens (user_id, access_token, refresh_token, expires_at, scope, cal_id, cal_name, connected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      scope = excluded.scope,
      cal_id = excluded.cal_id,
      cal_name = excluded.cal_name,
      connected_at = excluded.connected_at
  `).run(userId, access_token, refresh_token, expires_at, scope || '', cal_id || 'primary', cal_name || 'Quincha');
}

export function gcalClearTokens(userId) {
  db.prepare('DELETE FROM gcal_tokens WHERE user_id = ?').run(userId);
}

// ── OAuth helpers ─────────────────────────────────────────────────────────
export function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google refresh error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Valid access token (refresh si caducó) ─────────────────────────────────
export async function gcalValidToken(userId) {
  let tok = gcalGetTokens(userId);
  if (!tok) throw new Error('Google Calendar no conectado');
  const now = Date.now();
  if (tok.expires_at > now + 60000) return tok.access_token;

  const refreshed = await refreshAccessToken(tok.refresh_token);
  const expiresAt = Date.now() + Number(refreshed.expires_in || 3600) * 1000;
  gcalSaveTokens(userId, {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tok.refresh_token,
    expires_at: expiresAt,
    scope: refreshed.scope || tok.scope,
    cal_id: tok.cal_id,
    cal_name: tok.cal_name,
  });
  return refreshed.access_token;
}

// ── Google Calendar API helpers ────────────────────────────────────────────

// Listar eventos entre dos fechas
export async function gcalListEvents(userId, timeMin, timeMax) {
  const token = await gcalValidToken(userId);
  const tok = gcalGetTokens(userId);
  const qs = new URLSearchParams({
    timeMin: timeMin instanceof Date ? timeMin.toISOString() : timeMin,
    timeMax: timeMax instanceof Date ? timeMax.toISOString() : timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  });
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.cal_id)}/events?${qs}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Google events ${res.status}: ${text.slice(0, 200)}`);
      if (res.status === 401) err.status = 401;
      throw err;
    }
    const body = await res.json();
    return body.items || [];
  } catch (err) {
    if (err.status === 401) throw err;
    return [];
  }
}

// Crear un evento
export async function gcalCreateEvent(userId, event) {
  const token = await gcalValidToken(userId);
  const tok = gcalGetTokens(userId);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.cal_id)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google create ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Actualizar (mover/reagendar) un evento existente
export async function gcalUpdateEvent(userId, eventId, updates) {
  const token = await gcalValidToken(userId);
  const tok = gcalGetTokens(userId);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.cal_id)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google update ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Eliminar un evento
export async function gcalDeleteEvent(userId, eventId) {
  const token = await gcalValidToken(userId);
  const tok = gcalGetTokens(userId);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.cal_id)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google delete ${res.status}: ${text.slice(0, 200)}`);
  }
  return { ok: true };
}

// Borrar eventos de un calendario (mirror: para "vaciar")
export async function gcalClearEvents(userId, summaryPrefix = '') {
  const token = await gcalValidToken(userId);
  const tok = gcalGetTokens(userId);
  const items = await gcalListEvents(userId, new Date(0), new Date('2099-12-31'));
  let deleted = 0;
  for (const it of items) {
    if (summaryPrefix && !(it.summary || '').startsWith(summaryPrefix)) continue;
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.cal_id)}/events/${it.id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) deleted++;
  }
  return deleted;
}