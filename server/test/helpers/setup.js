// Configura una base SQLite temporal (por proceso de test) antes de importar el
// server, para que las pruebas nunca toquen la base real de server/data.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const tmpDb = path.join(os.tmpdir(), `quincha-test-${process.pid}-${Date.now()}.db`);
process.env.QUINCHA_DB_PATH = tmpDb;

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
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {
      /* ya no existe */
    }
  }
}