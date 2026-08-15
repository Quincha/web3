import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'quincha.db');

const [, , title, contentArg, tagsArg, authorArg] = process.argv;

if (!title || !contentArg) {
  console.error('Uso: node add_audit.js "Titulo" "archivo_contenido.md" "tag1,tag2" "autor"');
  process.exit(1);
}

let content = contentArg;
if (contentArg === '-') {
  content = fs.readFileSync(0, 'utf8');
} else if (fs.existsSync(contentArg)) {
  content = fs.readFileSync(contentArg, 'utf8');
}

const tags = String(tagsArg || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .slice(0, 20);

const author = authorArg || 'opencode';

const db = new DatabaseSync(DB_PATH);
const id = crypto.randomUUID();
const now = Date.now();

db.prepare(
  'INSERT INTO cerebro (id, kind, title, content, tags, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
).run(id, 'auditoria', String(title).trim().slice(0, 300), content, JSON.stringify(tags), author, now, now);

const row = db.prepare('SELECT id, title, author FROM cerebro WHERE id = ?').get(id);
console.log('Auditoria guardada:', row.id, '|', row.title);