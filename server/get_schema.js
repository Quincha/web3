import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('data/quincha.db');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log(JSON.stringify(tables, null, 2));
