import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, cleanupDb } from './helpers/setup.js';

let server;
let base;

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

async function createUser(username, password) {
  const { token: rootToken } = state;
  const res = await api('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${rootToken}` },
    body: JSON.stringify({ username, password, role: 'user', name: username }),
  });
  assert.equal(res.status, 201);
  return (await res.json()).user;
}

async function login(username, password) {
  const res = await api('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function upload(token, groupId, query, bytes = Buffer.from('fake-audio-bytes-0123456789')) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null),
  ).toString();
  return fetch(`${base}/api/recordings/groups/${groupId}/assets?${qs}`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
}

const state = {
  token: null,
  bob: null,
  carol: null,
  dave: null,
  bobToken: null,
  carolToken: null,
  daveToken: null,
  groupId: null,
  audioId: null,
  noteId: null,
};

test('01 install + usuarios bob (editor), carol (viewer), dave (externo)', async () => {
  const install = await api('/install', {
    method: 'POST',
    body: JSON.stringify({ username: 'root', password: 'clave-segura-123', name: 'Root' }),
  });
  assert.equal(install.status, 201);
  state.token = (await install.json()).token;

  state.bob = await createUser('bob', 'clave-bob-12345');
  state.carol = await createUser('carol', 'clave-carol-1234');
  state.dave = await createUser('dave', 'clave-dave-12345');
  state.bobToken = await login('bob', 'clave-bob-12345');
  state.carolToken = await login('carol', 'clave-carol-1234');
  state.daveToken = await login('dave', 'clave-dave-12345');
});

test('02 root crea grupo y aparece como owner en su lista', async () => {
  const res = await api('/recordings/groups', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ name: 'Reunión semanal', description: 'Anotaciones del equipo' }),
  });
  assert.equal(res.status, 201);
  const { group } = await res.json();
  assert.equal(group.name, 'Reunión semanal');
  state.groupId = group.id;

  const list = await (await api('/recordings/groups', { headers: auth(state.token) })).json();
  assert.equal(list.groups.length, 1);
  assert.equal(list.groups[0].role, 'owner');
});

test('03 añadir bob como editor; bob ve el grupo en su lista', async () => {
  const add = await api(`/recordings/groups/${state.groupId}/members`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'bob', role: 'editor' }),
  });
  assert.equal(add.status, 201);
  assert.equal((await add.json()).member.role, 'editor');

  const list = await (await api('/recordings/groups', { headers: auth(state.bobToken) })).json();
  assert.equal(list.groups.length, 1);
  assert.equal(list.groups[0].role, 'editor');
});

test('04 dave (externo) no ve ni accede al grupo', async () => {
  const list = await (await api('/recordings/groups', { headers: auth(state.daveToken) })).json();
  assert.equal(list.groups.length, 0);

  const res = await api(`/recordings/groups/${state.groupId}/timeline`, { headers: auth(state.daveToken) });
  assert.equal(res.status, 403);
});

test('05 bob sube audio webm y añade una nota', async () => {
  const up = await upload(state.bobToken, state.groupId, {
    filename: 'grabacion.webm', mime: 'audio/webm', kind: 'audio', durationMs: '1500',
  });
  assert.equal(up.status, 201);
  const { asset } = await up.json();
  assert.equal(asset.kind, 'audio');
  assert.equal(asset.durationMs, 1500);
  state.audioId = asset.id;

  const note = await api(`/recordings/groups/${state.groupId}/contributions`, {
    method: 'POST',
    headers: auth(state.bobToken),
    body: JSON.stringify({ kind: 'note', body: 'Acordamos enviar el informe el viernes' }),
  });
  assert.equal(note.status, 201);
  state.noteId = (await note.json()).contribution.id;
});

test('06 timeline trae asset + contribution en orden ascendente', async () => {
  const { items } = await (await api(`/recordings/groups/${state.groupId}/timeline`, { headers: auth(state.token) })).json();
  assert.equal(items.length, 2);
  assert.equal(items[0].type, 'asset');
  assert.equal(items[1].type, 'contribution');
  assert.equal(items[1].contribution.body, 'Acordamos enviar el informe el viernes');
});

test('07 descarga del audio: 200 completo y 206 con Range', async () => {
  const full = await fetch(`${base}/api/recordings/assets/${state.audioId}/file`, { headers: auth(state.token) });
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-type'), 'audio/webm');
  assert.equal(full.headers.get('accept-ranges'), 'bytes');
  const buf = Buffer.from(await full.arrayBuffer());
  assert.equal(buf.toString(), 'fake-audio-bytes-0123456789');

  const part = await fetch(`${base}/api/recordings/assets/${state.audioId}/file`, {
    headers: { ...auth(state.token), Range: 'bytes=0-3' },
  });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), 'bytes 0-3/27');
  assert.equal(Buffer.from(await part.arrayBuffer()).toString(), 'fake');
});

test('08 carol (viewer) puede leer pero no escribir', async () => {
  const add = await api(`/recordings/groups/${state.groupId}/members`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'carol', role: 'viewer' }),
  });
  assert.equal(add.status, 201);

  const timeline = await api(`/recordings/groups/${state.groupId}/timeline`, { headers: auth(state.carolToken) });
  assert.equal(timeline.status, 200);

  const note = await api(`/recordings/groups/${state.groupId}/contributions`, {
    method: 'POST',
    headers: auth(state.carolToken),
    body: JSON.stringify({ body: 'no debería poder' }),
  });
  assert.equal(note.status, 403);

  const up = await upload(state.carolToken, state.groupId, { filename: 'x.webm', mime: 'audio/webm', kind: 'audio' });
  assert.equal(up.status, 403);
});

test('09 bob (editor, no owner) no administra el grupo', async () => {
  const patch = await api(`/recordings/groups/${state.groupId}`, {
    method: 'PATCH',
    headers: auth(state.bobToken),
    body: JSON.stringify({ name: 'Hacked' }),
  });
  assert.equal(patch.status, 403);

  const del = await api(`/recordings/groups/${state.groupId}`, { method: 'DELETE', headers: auth(state.bobToken) });
  assert.equal(del.status, 403);

  const addMember = await api(`/recordings/groups/${state.groupId}/members`, {
    method: 'POST',
    headers: auth(state.bobToken),
    body: JSON.stringify({ username: 'dave', role: 'editor' }),
  });
  assert.equal(addMember.status, 403);
});

test('10 validación de subida: mime no permitido y archivo vacío', async () => {
  const badMime = await upload(state.bobToken, state.groupId, { filename: 'x.exe', mime: 'application/x-msdownload', kind: 'audio' });
  assert.equal(badMime.status, 400);

  const empty = await upload(state.bobToken, state.groupId, { filename: 'x.webm', mime: 'audio/webm', kind: 'audio' }, Buffer.alloc(0));
  assert.equal(empty.status, 400);
});

test('11 bob borra su propia contribución y su audio', async () => {
  const delNote = await api(`/recordings/contributions/${state.noteId}`, { method: 'DELETE', headers: auth(state.bobToken) });
  assert.equal(delNote.status, 200);

  const delAsset = await api(`/recordings/assets/${state.audioId}`, { method: 'DELETE', headers: auth(state.bobToken) });
  assert.equal(delAsset.status, 200);

  const gone = await fetch(`${base}/api/recordings/assets/${state.audioId}/file`, { headers: auth(state.token) });
  assert.equal(gone.status, 404);

  const { items } = await (await api(`/recordings/groups/${state.groupId}/timeline`, { headers: auth(state.token) })).json();
  assert.equal(items.length, 0);
});

test('12 SSE: root recibe evento cuando bob sube un documento', async () => {
  const ticketRes = await api('/recordings/streamticket', { method: 'POST', headers: auth(state.token) });
  assert.equal(ticketRes.status, 200);
  const { nonce } = await ticketRes.json();

  const ctrl = new AbortController();
  const streamRes = await fetch(`${base}/api/recordings/stream?nonce=${nonce}`, { signal: ctrl.signal });
  assert.equal(streamRes.status, 200);
  // deja que el server registre la conexión SSE antes de notificar
  await new Promise((r) => setTimeout(r, 150));

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let text = '';

  const readWithTimeout = (ms) => Promise.race([
    reader.read(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout SSE')), ms)),
  ]);

  try {
    const up = await upload(state.bobToken, state.groupId, {
      filename: 'informe.pdf', mime: 'application/pdf', kind: 'document',
    }, Buffer.from('%PDF-1.4 fake'));
    assert.equal(up.status, 201);

    const deadline = Date.now() + 3000;
    while (!text.includes('"type":"asset"') && Date.now() < deadline) {
      let chunk;
      try {
        chunk = await readWithTimeout(3000);
      } catch {
        break; // sin más datos: se valida abajo con lo recibido
      }
      if (chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    ctrl.abort();
  }
  assert.ok(text.includes('"type":"asset"'), `No llegó el evento SSE. Texto: ${text.slice(0, 200)}`);
});

test('13 root borra el grupo y todo desaparece para bob', async () => {
  const del = await api(`/recordings/groups/${state.groupId}`, { method: 'DELETE', headers: auth(state.token) });
  assert.equal(del.status, 200);

  const gone = await api(`/recordings/groups/${state.groupId}/timeline`, { headers: auth(state.bobToken) });
  assert.equal(gone.status, 404);

  const list = await (await api('/recordings/groups', { headers: auth(state.bobToken) })).json();
  assert.equal(list.groups.length, 0);
});
