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

  CREATE TABLE IF NOT EXISTS security_questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    answer_hash TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_security_questions_user ON security_questions(user_id);

  CREATE TABLE IF NOT EXISTS store (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE IF NOT EXISTS recording_groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recording_group_members (
    group_id TEXT NOT NULL REFERENCES recording_groups(id) ON DELETE CASCADE,
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role     TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
    added_at INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS recording_assets (
    id          TEXT PRIMARY KEY,
    group_id    TEXT NOT NULL REFERENCES recording_groups(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('audio','document')),
    filename    TEXT NOT NULL,
    mime        TEXT NOT NULL,
    size        INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    duration_ms INTEGER,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    deleted_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS recording_contributions (
    id         TEXT PRIMARY KEY,
    group_id   TEXT NOT NULL REFERENCES recording_groups(id) ON DELETE CASCADE,
    author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('note','comment')),
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recording_transcripts (
    id         TEXT PRIMARY KEY,
    asset_id   TEXT NOT NULL REFERENCES recording_assets(id) ON DELETE CASCADE,
    group_id   TEXT NOT NULL REFERENCES recording_groups(id) ON DELETE CASCADE,
    language   TEXT NOT NULL DEFAULT 'es',
    text       TEXT NOT NULL,
    source     TEXT NOT NULL CHECK (source IN ('gemini','manual')),
    status     TEXT NOT NULL CHECK (status IN ('pending','ready','failed')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recording_ai (
    id           TEXT PRIMARY KEY,
    group_id     TEXT NOT NULL REFERENCES recording_groups(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('summary','quiz')),
    payload_json TEXT NOT NULL,
    model        TEXT NOT NULL DEFAULT '',
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recording_quiz_results (
    id            TEXT PRIMARY KEY,
    ai_id         TEXT NOT NULL REFERENCES recording_ai(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score         INTEGER NOT NULL,
    total         INTEGER NOT NULL,
    answers_json  TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recording_jobs (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL CHECK (type IN ('transcribe','summarize','quiz')),
    target_id  TEXT NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('queued','running','done','failed')),
    error      TEXT NOT NULL DEFAULT '',
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recording_audit (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action    TEXT NOT NULL,
    target    TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    at        INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recording_members_user ON recording_group_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_recording_assets_group ON recording_assets(group_id, deleted_at);
  CREATE INDEX IF NOT EXISTS idx_recording_contrib_group ON recording_contributions(group_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_recording_transcripts_group ON recording_transcripts(group_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_recording_quiz_results_ai ON recording_quiz_results(ai_id, created_at);
`);

// Módulo de diseños eliminado: borra la tabla si existía en DBs viejas.
db.exec('DROP TABLE IF EXISTS designs');

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

export function getAllUsers() {
  return db.prepare('SELECT id, username, role, name, created_at FROM users ORDER BY id').all();
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

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
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

// --- Preguntas de seguridad (recuperación de contraseña) ---

export function setSecurityQuestions(userId, questions) {
  // questions: [{ question: string, answer: string }]
  db.prepare('DELETE FROM security_questions WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT INTO security_questions (user_id, question, answer_hash, created_at) VALUES (?, ?, ?, ?)');
  for (const q of questions) {
    insert.run(userId, q.question.trim(), hashPassword(q.answer.trim().toLowerCase()), Date.now());
  }
}

export function getSecurityQuestions(username) {
  const user = getUserByUsername(username);
  if (!user) return null;
  const rows = db.prepare('SELECT id, question FROM security_questions WHERE user_id = ? ORDER BY id').all(user.id);
  return { userId: user.id, questions: rows };
}

export function verifySecurityAnswers(userId, answers) {
  // answers: string[] — en el mismo orden que las preguntas guardadas
  const rows = db.prepare('SELECT answer_hash FROM security_questions WHERE user_id = ? ORDER BY id').all(userId);
  if (rows.length === 0 || answers.length !== rows.length) return false;
  for (let i = 0; i < rows.length; i += 1) {
    if (!verifyPassword(String(answers[i] || '').trim().toLowerCase(), rows[i].answer_hash)) return false;
  }
  return true;
}

export function hasSecurityQuestions(userId) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM security_questions WHERE user_id = ?').get(userId);
  return row.n > 0;
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

// --------------------------------------------------------------------------
// Grabaciones colaborativas — helpers
// --------------------------------------------------------------------------
export function createRecordingGroup(id, name, description, ownerId) {
  const now = Date.now();
  db.prepare(
    'INSERT INTO recording_groups (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, description, ownerId, now, now);
  addRecordingGroupMember(id, ownerId, 'owner');
  return getRecordingGroup(id);
}

export function getRecordingGroup(id) {
  return db.prepare('SELECT * FROM recording_groups WHERE id = ?').get(id);
}

export function listRecordingGroupsForUser(userId) {
  return db.prepare(`
    SELECT g.id, g.name, g.description, g.owner_id, g.created_at, g.updated_at,
           m.role AS role,
           (SELECT COUNT(*) FROM recording_group_members WHERE group_id = g.id) AS member_count,
           (SELECT COUNT(*) FROM recording_assets WHERE group_id = g.id AND deleted_at IS NULL) AS asset_count
    FROM recording_groups g
    JOIN recording_group_members m ON m.group_id = g.id AND m.user_id = ?
    ORDER BY g.updated_at DESC
  `).all(userId);
}

export function updateRecordingGroup(id, name, description) {
  db.prepare('UPDATE recording_groups SET name = ?, description = ?, updated_at = ? WHERE id = ?')
    .run(name, description, Date.now(), id);
  return getRecordingGroup(id);
}

function touchRecordingGroup(id, ts = Date.now()) {
  db.prepare('UPDATE recording_groups SET updated_at = ? WHERE id = ?').run(ts, id);
}

export function deleteRecordingGroup(id) {
  db.prepare('DELETE FROM recording_groups WHERE id = ?').run(id);
}

export function addRecordingGroupMember(groupId, userId, role) {
  db.prepare(`
    INSERT INTO recording_group_members (group_id, user_id, role, added_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(group_id, user_id) DO UPDATE SET role = excluded.role
  `).run(groupId, userId, role, Date.now());
}

export function listRecordingGroupMembers(groupId) {
  return db.prepare(`
    SELECT m.user_id, m.role, m.added_at, u.username, u.name
    FROM recording_group_members m
    JOIN users u ON u.id = m.user_id
    WHERE m.group_id = ?
    ORDER BY m.added_at ASC
  `).all(groupId);
}

export function getRecordingGroupMember(groupId, userId) {
  return db.prepare('SELECT * FROM recording_group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

export function removeRecordingGroupMember(groupId, userId) {
  db.prepare('DELETE FROM recording_group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
}

export function insertRecordingAsset(asset) {
  db.prepare(`
    INSERT INTO recording_assets (id, group_id, kind, filename, mime, size, storage_path, duration_ms, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `  ).run(asset.id, asset.groupId, asset.kind, asset.filename, asset.mime, asset.size,
    asset.storagePath, asset.durationMs ?? null, asset.uploadedBy, asset.createdAt);
  touchRecordingGroup(asset.groupId, asset.createdAt);
  return getRecordingAsset(asset.id);
}

export function getRecordingAsset(id) {
  return db.prepare('SELECT * FROM recording_assets WHERE id = ?').get(id);
}

export function sumGroupAssetSize(groupId) {
  const row = db.prepare('SELECT COALESCE(SUM(size), 0) AS total FROM recording_assets WHERE group_id = ? AND deleted_at IS NULL').get(groupId);
  return row.total;
}

export function softDeleteRecordingAsset(id) {
  db.prepare('UPDATE recording_assets SET deleted_at = ? WHERE id = ?').run(Date.now(), id);
}

export function listGroupAssetPaths(groupId) {
  return db.prepare('SELECT storage_path FROM recording_assets WHERE group_id = ?').all(groupId);
}

export function insertRecordingContribution(id, groupId, authorId, kind, body) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO recording_contributions (id, group_id, author_id, kind, body, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `  ).run(id, groupId, authorId, kind, body, now, now);
  touchRecordingGroup(groupId, now);
  return getRecordingContribution(id);
}

export function getRecordingContribution(id) {
  return db.prepare('SELECT * FROM recording_contributions WHERE id = ?').get(id);
}

export function updateRecordingContribution(id, body) {
  db.prepare('UPDATE recording_contributions SET body = ?, updated_at = ? WHERE id = ?')
    .run(body, Date.now(), id);
  return getRecordingContribution(id);
}

export function deleteRecordingContribution(id) {
  db.prepare('DELETE FROM recording_contributions WHERE id = ?').run(id);
}

// Timeline unificada (assets vivos + contribuciones + transcripts) ordenada asc.
// `since` (ms) filtra por fecha para el fallback de polling sin SSE.
export function listRecordingTimeline(groupId, since = 0, limit = 200) {
  const assets = db.prepare(`
    SELECT a.*, u.username AS author_username, u.name AS author_name
    FROM recording_assets a JOIN users u ON u.id = a.uploaded_by
    WHERE a.group_id = ? AND a.deleted_at IS NULL AND a.created_at >= ?
  `).all(groupId, since);
  const contributions = db.prepare(`
    SELECT c.*, u.username AS author_username, u.name AS author_name
    FROM recording_contributions c JOIN users u ON u.id = c.author_id
    WHERE c.group_id = ? AND c.created_at >= ?
  `).all(groupId, since);

  const items = [
    ...assets.map((a) => ({
      type: 'asset',
      id: a.id,
      createdAt: a.created_at,
      author: { id: a.uploaded_by, username: a.author_username, name: a.author_name },
      asset: {
        kind: a.kind, filename: a.filename, mime: a.mime, size: a.size, durationMs: a.duration_ms,
      },
    })),
    ...contributions.map((c) => ({
      type: 'contribution',
      id: c.id,
      createdAt: c.created_at,
      author: { id: c.author_id, username: c.author_username, name: c.author_name },
      contribution: {
        kind: c.kind, body: c.body, updatedAt: c.updated_at,
      },
    })),
  ];
  items.sort((x, y) => x.createdAt - y.createdAt || String(x.id).localeCompare(String(y.id)));
  return items.slice(-Math.max(1, Math.min(limit, 500)));
}

export function insertRecordingAudit(actorId, action, target, meta = {}) {
  db.prepare('INSERT INTO recording_audit (actor_id, action, target, meta_json, at) VALUES (?, ?, ?, ?, ?)')
    .run(actorId, action, target, JSON.stringify(meta), Date.now());
}

// --------------------------------------------------------------------------
// Grabaciones — jobs en cola (transcripción / resumen IA)
// --------------------------------------------------------------------------
export function insertRecordingJob(id, type, targetId) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO recording_jobs (id, type, target_id, status, error, attempts, created_at, updated_at)
    VALUES (?, ?, ?, 'queued', '', 0, ?, ?)
  `).run(id, type, targetId, now, now);
  return getRecordingJob(id);
}

export function getRecordingJob(id) {
  return db.prepare('SELECT * FROM recording_jobs WHERE id = ?').get(id);
}

// Reclama el próximo job en cola de forma atómica (un solo worker).
export function claimNextRecordingJob() {
  const row = db.prepare(`
    UPDATE recording_jobs SET status = 'running', updated_at = ?
    WHERE id = (SELECT id FROM recording_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1)
    RETURNING *
  `).get(Date.now());
  return row || null;
}

export function finishRecordingJob(id, status, error = '') {
  db.prepare(`
    UPDATE recording_jobs SET status = ?, error = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?
  `).run(status, error.slice(0, 500), Date.now(), id);
}

// --------------------------------------------------------------------------
// Grabaciones — transcripts (upsert por asset) y artefactos IA
// --------------------------------------------------------------------------
export function upsertRecordingTranscript(id, assetId, groupId, text, source, createdBy) {
  const existing = db.prepare('SELECT id FROM recording_transcripts WHERE asset_id = ?').get(assetId);
  const now = Date.now();
  if (existing) {
    db.prepare(`
      UPDATE recording_transcripts SET language = 'es', text = ?, source = ?, status = 'ready', created_at = ? WHERE id = ?
    `).run(text, source, now, existing.id);
    return getRecordingTranscript(existing.id);
  }
  db.prepare(`
    INSERT INTO recording_transcripts (id, asset_id, group_id, language, text, source, status, created_by, created_at)
    VALUES (?, ?, ?, 'es', ?, ?, 'ready', ?, ?)
  `).run(id, assetId, groupId, text, source, createdBy, now);
  return getRecordingTranscript(id);
}

export function getRecordingTranscript(id) {
  return db.prepare('SELECT * FROM recording_transcripts WHERE id = ?').get(id);
}

export function getRecordingTranscriptByAsset(assetId) {
  return db.prepare('SELECT * FROM recording_transcripts WHERE asset_id = ?').get(assetId);
}

export function insertRecordingAi(id, groupId, kind, payload, model) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO recording_ai (id, group_id, kind, payload_json, model, created_at) VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, groupId, kind, JSON.stringify(payload), model, now);
  return getRecordingAi(id);
}

export function getRecordingAi(id) {
  return db.prepare('SELECT * FROM recording_ai WHERE id = ?').get(id);
}

export function listRecordingAiByGroup(groupId, kind = null) {
  if (kind) {
    return db.prepare('SELECT * FROM recording_ai WHERE group_id = ? AND kind = ? ORDER BY created_at DESC').all(groupId, kind);
  }
  return db.prepare('SELECT * FROM recording_ai WHERE group_id = ? ORDER BY created_at DESC').all(groupId);
}

// Corpus de texto de un grupo para resumir: notas + transcripts.
export function listGroupTextCorpus(groupId) {
  const notes = db.prepare(`
    SELECT body AS text, created_at FROM recording_contributions WHERE group_id = ?
  `).all(groupId);
  const transcripts = db.prepare(`
    SELECT t.text AS text, t.created_at
    FROM recording_transcripts t
    JOIN recording_assets a ON a.id = t.asset_id AND a.deleted_at IS NULL
    WHERE t.group_id = ?
  `).all(groupId);
  return [...notes, ...transcripts].sort((a, b) => a.created_at - b.created_at);
}

export function insertRecordingQuizResult(id, aiId, userId, score, total, answers) {
  db.prepare(`
    INSERT INTO recording_quiz_results (id, ai_id, user_id, score, total, answers_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, aiId, userId, score, total, JSON.stringify(answers), Date.now());
  return getRecordingQuizResult(id);
}

export function getRecordingQuizResult(id) {
  return db.prepare('SELECT * FROM recording_quiz_results WHERE id = ?').get(id);
}

export function listRecordingQuizResults(aiId) {
  return db.prepare(`
    SELECT r.id, r.ai_id, r.user_id, r.score, r.total, r.answers_json, r.created_at,
           u.username, u.name
    FROM recording_quiz_results r
    JOIN users u ON u.id = r.user_id
    WHERE r.ai_id = ?
    ORDER BY r.created_at DESC
  `).all(aiId);
}
