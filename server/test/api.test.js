import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, db, gcalChannelValid, cleanupDb } from './helpers/setup.js';

let server;
let base;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  ({ server, base } = await start());
});

after(() => {
  cleanupDb();
  server.closeAllConnections?.();
  server.close();
});

function api(path, opts = {}) {
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

const USER = { username: 'root', password: 'clave-segura-123', name: 'Admin' };

test('install crea el primer usuario y responde 409 si ya existe', async () => {
  const res = await api('/install', { method: 'POST', body: JSON.stringify(USER) });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.token);

  const res2 = await api('/install', { method: 'POST', body: JSON.stringify(USER) });
  assert.equal(res2.status, 409);
});

test('login correcto devuelve token y /me autentica', async () => {
  const login = await api('/login', { method: 'POST', body: JSON.stringify(USER) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  assert.ok(token);

  const me = await api('/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  const profile = await me.json();
  assert.equal(profile.username, USER.username);
});

test('rate limit: tras 5 intentos fallidos /login responde 429', async () => {
  const { rateBuckets } = await import('../src/index.js');
  rateBuckets.clear();

  for (let i = 0; i < 5; i++) {
    const res = await api('/login', { method: 'POST', body: JSON.stringify({ username: USER.username, password: 'incorrecta' }) });
    assert.equal(res.status, 401);
  }
  const blocked = await api('/login', { method: 'POST', body: JSON.stringify(USER) });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
});

test('cambio de contraseña: valida la actual y actualiza la clave', async () => {
  const { rateBuckets } = await import('../src/index.js');
  rateBuckets.clear();

  const login = await api('/login', { method: 'POST', body: JSON.stringify(USER) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const auth = { Authorization: `Bearer ${token}` };

  // contraseña actual incorrecta -> 403
  const bad = await api('/password', { method: 'POST', headers: auth, body: JSON.stringify({ current: 'mala', next: 'nueva-clave-456' }) });
  assert.equal(bad.status, 403);

  // nueva corta -> 400
  const short = await api('/password', { method: 'POST', headers: auth, body: JSON.stringify({ current: 'clave-segura-123', next: 'corta' }) });
  assert.equal(short.status, 400);

  // ok
  const ok = await api('/password', { method: 'POST', headers: auth, body: JSON.stringify({ current: 'clave-segura-123', next: 'nueva-clave-456' }) });
  assert.equal(ok.status, 200);

  // login con la nueva clave funciona; con la vieja no
  const okLogin = await api('/login', { method: 'POST', body: JSON.stringify({ username: USER.username, password: 'nueva-clave-456' }) });
  assert.equal(okLogin.status, 200);
  const oldLogin = await api('/login', { method: 'POST', body: JSON.stringify({ username: USER.username, password: 'clave-segura-123' }) });
  assert.equal(oldLogin.status, 401);
});

test('sync POST escribe y purga sync_event:* viejos; GET soporta ?since=', async () => {
  const login = await api('/login', { method: 'POST', body: JSON.stringify({ username: USER.username, password: 'nueva-clave-456' }) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const auth = { Authorization: `Bearer ${token}` };

  await api('/sync', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      entries: [
        { key: 'misc:nota', data: { hola: 'mundo' }, updatedAt: Date.now() },
        { key: 'sync_event:viejo', data: { tipo: 'x' }, updatedAt: Date.now() },
      ],
    }),
  });

  // Un key sync_event con updated_at de hace 26 h entra y debe ser purgado.
  await api('/sync', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      entries: [{ key: 'sync_event:antiguo', data: { tipo: 'viejo' }, updatedAt: Date.now() - 26 * 3600 * 1000 }],
    }),
  });

  const full = await api('/sync', { headers: auth });
  assert.equal(full.status, 200);
  const fullBody = await full.json();
  const keys = fullBody.db.map((r) => r.key);
  assert.ok(keys.includes('misc:nota'));
  assert.ok(keys.includes('sync_event:viejo'));
  assert.ok(!keys.includes('sync_event:antiguo'), 'sync_event viejos deben purgarse');

  // con `since` en el futuro no debe traer lo posteado antes...
  const since = await api('/sync?since=' + (Date.now() + 5000), { headers: auth });
  const sinceBody = await since.json();
  assert.ok(!sinceBody.db.some((r) => r.key === 'misc:nota'));

  // ...pero con un corte hace 1 minuto sí lo trae.
  const sincePast = await api('/sync?since=' + (Date.now() - 60000), { headers: auth });
  const sincePastBody = await sincePast.json();
  assert.ok(sincePastBody.db.some((r) => r.key === 'misc:nota'));
});

test('sesiones expiradas dejan de autorizar', async () => {
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run('token-expirado', 1, Date.now() - 5000);
  const me = await api('/me', { headers: { Authorization: 'Bearer token-expirado' } });
  assert.equal(me.status, 401);
});

test('webhook: solo notifica cuando el canal coincide con gcal_watch', async () => {
  db.prepare(`INSERT OR REPLACE INTO gcal_watch (user_id, channel_id, resource_id, expires_at) VALUES (?, ?, ?, ?)`)
    .run(1, 'ch_test_1', 'res_test_1', Date.now() + 3600 * 1000);

  assert.ok(gcalChannelValid(1, 'ch_test_1', 'res_test_1'));
  assert.ok(!gcalChannelValid(1, 'otro_canal', 'res_test_1'));
  assert.ok(!gcalChannelValid(999, 'ch_test_1', 'res_test_1'));

  // Canal desconocido / token falso: siempre responde 200 (Google lo exige) sin error.
  const fake = await api('/gcal/webhook', {
    method: 'POST',
    headers: { 'X-Goog-Channel-Token': 'gcal_999', 'X-Goog-Channel-ID': 'ch_fake' },
  });
  assert.equal(fake.status, 200);

  // Canal válido pero channel-id incorrecto: también 200 e ignorado.
  const mismatched = await api('/gcal/webhook', {
    method: 'POST',
    headers: { 'X-Goog-Channel-Token': 'gcal_1', 'X-Goog-Channel-ID': 'ch_incorrecto' },
  });
  assert.equal(mismatched.status, 200);
});

test('SSE: con nonce válido abre el stream y el webhook válido dispara refresh', async () => {
  const login = await api('/login', { method: 'POST', body: JSON.stringify({ username: USER.username, password: 'nueva-clave-456' }) });
  const { token } = await login.json();
  const nonceRes = await api('/gcal/streamticket', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  assert.equal(nonceRes.status, 200);
  const { nonce } = await nonceRes.json();

  // Abrimos el stream real con ese nonce; debe quedar 200 y consumir el nonce.
  const streamRes = await fetch(`${base}/api/gcal/stream?nonce=${encodeURIComponent(nonce)}`);
  assert.equal(streamRes.status, 200);

  // Reusar el mismo nonce ya consume y debe rechazarse (un solo uso).
  const reuse = await api('/gcal/stream?nonce=' + encodeURIComponent(nonce));
  assert.equal(reuse.status, 401, 'el nonce es de un solo uso');

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let gotRefresh = false;

  const reading = (async () => {
    while (!gotRefresh) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text.includes('refresh')) gotRefresh = true;
    }
  })().catch(() => {});

  // Esperar a que la conexión quede establecida antes de "notificar".
  await sleep(200);
  for (let i = 0; i < 3 && !gotRefresh; i++) {
    await api('/gcal/webhook', {
      method: 'POST',
      headers: { 'X-Goog-Channel-Token': 'gcal_1', 'X-Goog-Channel-ID': 'ch_test_1', 'X-Goog-Resource-ID': 'res_test_1' },
    });
    await sleep(300);
  }

  await Promise.race([reading, sleep(3000)]);
  await reader.cancel().catch(() => {});
  await streamRes.body?.cancel().catch(() => {});
  assert.equal(gotRefresh, true, 'el webhook válido debe emitir refresh por SSE');
});

test('health sin sesión responde ok', async () => {
  const res = await api('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});