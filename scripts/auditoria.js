#!/usr/bin/env node
/**
 * auditoria.js — Registra y lista auditorías directamente en la BD del servidor
 * (misma clave `data:registro` que usa el módulo Registro de la web).
 *
 * Uso:
 *   node scripts/auditoria.js list
 *   node scripts/auditoria.js add --titulo "..." --resumen "..." [--detalle "..."] [--tipo cambio]
 *
 * El registro se sincroniza al navegador en la próxima recarga (pull del DataSyncService).
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.QUINCHA_DB_PATH || path.join(__dirname, '..', 'server', 'data', 'quincha.db');

const SERVER_KEY = 'data:registro';

function parseArgs(argv) {
  const cmd = argv[2];
  const opts = {};
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      opts[key] = argv[i + 1];
      i++;
    }
  }
  return { cmd, opts };
}

function openDb() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`No existe la BD: ${DB_PATH}\n¿Está el backend corriendo? (npm run start)`);
    process.exit(1);
  }
  return new DatabaseSync(DB_PATH);
}

function firstUser(db) {
  return db.prepare('SELECT id, username FROM users ORDER BY id ASC LIMIT 1').get();
}

function readStore(db, userId) {
  const row = db.prepare('SELECT data FROM store WHERE user_id = ? AND key = ?').get(userId, SERVER_KEY);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

function writeStore(db, userId, envelope) {
  db.prepare(`
    INSERT INTO store (user_id, key, data, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(userId, SERVER_KEY, JSON.stringify(envelope), envelope.updatedAt);
}

function listAuditorias(db) {
  const user = firstUser(db);
  if (!user) {
    console.log('No hay usuarios registrados en la BD.');
    return;
  }
  const envelope = readStore(db, user.id);
  const items = (envelope?.data?.auditorias) || [];
  if (items.length === 0) {
    console.log('No hay auditorías registradas.');
    return;
  }
  const sorted = [...items].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  for (const a of sorted) {
    console.log(`[${a.fecha}] (${a.tipo}) ${a.titulo} — ${a.resumen} — por ${a.autor}`);
    if (a.detalle) console.log(`    ${a.detalle.split('\n').join('\n    ')}`);
  }
}

function addAuditoria(db, opts) {
  if (!opts.titulo || !opts.resumen) {
    console.error('Faltan --titulo y/o --resumen');
    process.exit(1);
  }
  const user = firstUser(db);
  if (!user) {
    console.error('No hay usuarios en la BD para asociar la auditoría.');
    process.exit(1);
  }

  const envelope = readStore(db, user.id) || { data: { auditorias: [] } };
  const list = Array.isArray(envelope.data?.auditorias) ? envelope.data.auditorias : [];
  const auditoria = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fecha: new Date().toISOString(),
    titulo: opts.titulo,
    resumen: opts.resumen,
    detalle: opts.detalle || '',
    tipo: opts.tipo || 'cambio',
    autor: opts.autor || 'sistema',
  };

  list.push(auditoria);
  envelope.data = { ...envelope.data, auditorias: list };
  envelope.updatedAt = Date.now();
  writeStore(db, user.id, envelope);

  console.log(`Auditoría guardada para "${user.username}" (${list.length} en total):`);
  console.log(`  [${auditoria.fecha}] (${auditoria.tipo}) ${auditoria.titulo} — ${auditoria.resumen}`);
  console.log('Se sincronizará al navegador en la próxima recarga de la página.');
}

const { cmd, opts } = parseArgs(process.argv);
const db = openDb();

if (cmd === 'list') {
  listAuditorias(db);
} else if (cmd === 'add') {
  addAuditoria(db, opts);
} else {
  console.log(`Uso: node scripts/auditoria.js <list|add>`);
  console.log(`  node scripts/auditoria.js list`);
  console.log(`  node scripts/auditoria.js add --titulo "..." --resumen "..." [--detalle "..."] [--tipo cambio]`);
}

db.close();
