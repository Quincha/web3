import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.QUINCHA_DATA_DIR || path.join(__dirname, '..', 'data');
export const DB_PATH = process.env.QUINCHA_DB_PATH || path.join(DATA_DIR, 'quincha.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

// Sesiones: vida util configurable (por defecto 30 dias, se renueva con uso).
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 30 * 24) * 3600 * 1000;

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    name          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS configs (
    user_id  INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data     TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS store (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key)
  );
`);

// Migración para bases ya existentes: agrega expires_at a sessions y les da
// una vida útil completa a las sesiones abiertas hoy (no las invalida).
const sessionCols = db.prepare('PRAGMA table_info(sessions)').all();
if (!sessionCols.some((c) => c.name === 'expires_at')) {
  db.exec('ALTER TABLE sessions ADD COLUMN expires_at INTEGER');
  db.prepare('UPDATE sessions SET expires_at = ? WHERE expires_at IS NULL').run(Date.now() + SESSION_TTL_MS);
}

export function pruneExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?').run(Date.now());
}

export function countUsers() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  return row.n;
}

export function createUser(username, password, role, name) {
  const hash = hashPassword(password);
  const res = db
    .prepare('INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)')
    .run(username, hash, role, name);
  return res.lastInsertRowid;
}

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function updatePassword(username, password) {
  const hash = hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
}

export function verifyPassword(password, hash) {
  const [saltHex, storedHash] = hash.split(':');
  if (!saltHex || !storedHash) return false;
  const derived = crypto.scryptSync(password, saltHex, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(storedHash));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, Date.now() + SESSION_TTL_MS);
  return token;
}

export function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// Valida el token (incluida la expiración) y, si la sesión ya consumió más de
// la mitad de su vida útil, la renueva deslizante para no expirar en uso.
export function getUserByToken(token) {
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!row) return null;
  if (row.expires_at && row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  if (row.expires_at && row.expires_at - Date.now() < SESSION_TTL_MS / 2) {
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(Date.now() + SESSION_TTL_MS, token);
  }
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
}

export function getConfig(userId) {
  const row = db.prepare('SELECT data FROM configs WHERE user_id = ?').get(userId);
  return row ? row.data : '{}';
}

export function saveConfig(userId, data) {
  db.prepare(`
    INSERT INTO configs (user_id, data, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(userId, data);
}

export function putStore(userId, key, data, updatedAt) {
  db.prepare(`
    INSERT INTO store (user_id, key, data, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(userId, key, data, updatedAt);
}

export function getAllStore(userId) {
  return db.prepare('SELECT key, data, updated_at FROM store WHERE user_id = ?').all(userId);
}

// Sync incremental: solo las claves modificadas después de `sinceTs`.
export function getStoreSince(userId, sinceTs) {
  return db.prepare('SELECT key, data, updated_at FROM store WHERE user_id = ? AND updated_at >= ?').all(userId, sinceTs);
}

// Elimina claves viejas que empiecen con `prefix` (p. ej. la cola de sync).
export function pruneStore(userId, prefix, beforeTs) {
  db.prepare('DELETE FROM store WHERE user_id = ? AND key LIKE ? AND updated_at < ?').run(userId, `${prefix}%`, beforeTs);
}
