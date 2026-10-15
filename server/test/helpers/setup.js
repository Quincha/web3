// Configura una base SQLite temporal (por proceso de test) antes de importar el
// server, para que las pruebas nunca toquen la base real de server/data.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const tmpData = path.join(os.tmpdir(), `quincha-test-data-${process.pid}-${Date.now()}`);
fs.mkdirSync(tmpData, { recursive: true });
const tmpDb = path.join(tmpData, 'quincha.db');
process.env.QUINCHA_DATA_DIR = tmpData;
process.env.QUINCHA_DB_PATH = tmpDb;
// El worker de jobs de grabaciones se prueba directamente vía helpers de db.
process.env.QUINCHA_RECORDINGS_WORKER = '0';

export const { app } = await import('../../src/index.js');
export const { db } = await import('../../src/db.js');
export const { gcalChannelValid } = await import('../../src/gcal.js');

export async function start() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

export function cleanupDb() {
  // Windows no permite borrar la DB mientras node:sqlite mantiene el archivo
  // abierto; se intenta borrar el directorio y, si falla, se deja en /tmp.
  try {
    fs.rmSync(tmpData, { recursive: true, force: true });
  } catch {
    /* handle aún abierto en Windows */
  }
}