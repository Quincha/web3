import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, cleanupDb } from './helpers/setup.js';

let server;
let base;
const state = { token: null, bobToken: null, groupId: null, audioId: null };

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
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

test('01 setup: install, usuarios, grupo y audio', async () => {
  const install = await api('/install', {
    method: 'POST',
    body: JSON.stringify({ username: 'root', password: 'clave-segura-123', name: 'Root' }),
  });
  assert.equal(install.status, 201);
  state.token = (await install.json()).token;

  await api('/users', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'bob', password: 'clave-bob-12345', role: 'user', name: 'Bob' }),
  });
  const login = await api('/login', { method: 'POST', body: JSON.stringify({ username: 'bob', password: 'clave-bob-12345' }) });
  state.bobToken = (await login.json()).token;

  const group = await api('/recordings/groups', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ name: 'IA tests', description: '' }),
  });
  state.groupId = (await group.json()).group.id;

  await api(`/recordings/groups/${state.groupId}/members`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'bob', role: 'editor' }),
  });

  const up = await fetch(`${base}/api/recordings/groups/${state.groupId}/assets?filename=a.webm&mime=audio/webm&kind=audio`, {
    method: 'POST',
    headers: { ...auth(state.token), 'Content-Type': 'application/octet-stream' },
    body: Buffer.from('fake-audio-for-ai'),
  });
  assert.equal(up.status, 201);
  state.audioId = (await up.json()).asset.id;
});

test('02 transcripción manual: guarda, devuelve y reemplaza', async () => {
  const save = await api(`/recordings/assets/${state.audioId}/transcript`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ text: 'Hola equipo, revisemos el informe' }),
  });
  assert.equal(save.status, 200);
  const { transcript } = await save.json();
  assert.equal(transcript.source, 'manual');
  assert.equal(transcript.status, 'ready');

  const get = await (await api(`/recordings/assets/${state.audioId}/transcript`, { headers: auth(state.token) })).json();
  assert.equal(get.transcript.text, 'Hola equipo, revisemos el informe');

  const replace = await api(`/recordings/assets/${state.audioId}/transcript`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ text: 'Texto corregido por el equipo' }),
  });
  assert.equal(replace.status, 200);
  const after2 = await (await api(`/recordings/assets/${state.audioId}/transcript`, { headers: auth(state.token) })).json();
  assert.equal(after2.transcript.text, 'Texto corregido por el equipo');
  assert.equal(after2.transcript.source, 'manual');
});

test('03 transcripción automática sin GEMINI_API_KEY responde 503 con ayuda', async () => {
  const res = await api(`/recordings/assets/${state.audioId}/transcript`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.ok(body.error.includes('GEMINI_API_KEY'));
  assert.ok(body.error.includes('manual'));
});

test('04 resumen IA sin clave responde 503', async () => {
  const res = await api(`/recordings/groups/${state.groupId}/ai/summary`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.ok(body.error.includes('GEMINI_API_KEY'));
});

test('05 viewer no puede transcribir ni pedir resumen', async () => {
  await api(`/recordings/groups/${state.groupId}/members`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'bob', role: 'viewer' }),
  });
  const t = await api(`/recordings/assets/${state.audioId}/transcript`, {
    method: 'POST',
    headers: auth(state.bobToken),
    body: JSON.stringify({ text: 'no debo poder' }),
  });
  assert.equal(t.status, 403);

  // volver a editor para el resto
  await api(`/recordings/groups/${state.groupId}/members`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'bob', role: 'editor' }),
  });
});

test('06 cola de jobs: claim atómico y finish (helpers de db)', async () => {
  const {
    insertRecordingJob, claimNextRecordingJob, finishRecordingJob, getRecordingJob,
  } = await import('../src/db.js');

  const job = insertRecordingJob('job-test-1', 'transcribe', state.audioId);
  assert.equal(job.status, 'queued');

  const claimed = claimNextRecordingJob();
  assert.equal(claimed.id, 'job-test-1');
  assert.equal(claimed.status, 'running');

  // sin más jobs en cola, el siguiente claim es null
  assert.equal(claimNextRecordingJob(), null);

  finishRecordingJob('job-test-1', 'done');
  assert.equal(getRecordingJob('job-test-1').status, 'done');
});

test('07 GET /jobs/:id valida membresía del grupo de destino', async () => {
  const { insertRecordingJob } = await import('../src/db.js');
  insertRecordingJob('job-group-1', 'summarize', state.groupId);

  // dave no es miembro
  await api('/users', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'dave', password: 'clave-dave-12345', role: 'user', name: 'Dave' }),
  });
  const daveLogin = await api('/login', { method: 'POST', body: JSON.stringify({ username: 'dave', password: 'clave-dave-12345' }) });
  const daveToken = (await daveLogin.json()).token;

  const forbidden = await api('/recordings/jobs/job-group-1', { headers: auth(daveToken) });
  assert.equal(forbidden.status, 403);

  const ok = await api('/recordings/jobs/job-group-1', { headers: auth(state.token) });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).job.type, 'summarize');
});

test('08 GET /groups/:id/ai devuelve lista vacía (sin artefactos aún)', async () => {
  const res = await (await api(`/recordings/groups/${state.groupId}/ai`, { headers: auth(state.token) })).json();
  assert.equal(res.ok, true);
  assert.deepEqual(res.items, []);
});

test('09 cuestionario IA sin clave responde 503', async () => {
  const res = await api(`/recordings/groups/${state.groupId}/ai/quiz`, {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.ok(body.error.includes('GEMINI_API_KEY'));
});

test('10 resultados de quiz: valida respuestas y computa score', async () => {
  const { insertRecordingAi } = await import('../src/db.js');
  insertRecordingAi('quiz-test-1', state.groupId, 'quiz', {
    questions: [
      { question: '¿Cuál es 2+2?', options: ['3', '4', '5', '6'], answer: 1, explanation: 'Suma básica' },
      { question: '¿Color del cielo?', options: ['Azul', 'Rojo'], answer: 0 },
    ],
  }, 'test-model');

  // conteo incorrecto
  const badCount = await api('/recordings/ai/quiz-test-1/quiz-results', {
    method: 'POST', headers: auth(state.token), body: JSON.stringify({ answers: [1] }),
  });
  assert.equal(badCount.status, 400);

  // índice fuera de rango
  const badIdx = await api('/recordings/ai/quiz-test-1/quiz-results', {
    method: 'POST', headers: auth(state.token), body: JSON.stringify({ answers: [1, 5] }),
  });
  assert.equal(badIdx.status, 400);

  // respuestas correctas → score 2/2
  const okRes = await api('/recordings/ai/quiz-test-1/quiz-results', {
    method: 'POST', headers: auth(state.token), body: JSON.stringify({ answers: [1, 0] }),
  });
  assert.equal(okRes.status, 201);
  const { result } = await okRes.json();
  assert.equal(result.score, 2);
  assert.equal(result.total, 2);

  // una incorrecta → 1/2
  const partial = await api('/recordings/ai/quiz-test-1/quiz-results', {
    method: 'POST', headers: auth(state.bobToken), body: JSON.stringify({ answers: [0, 0] }),
  });
  assert.equal(partial.status, 201);
  assert.equal((await partial.json()).result.score, 1);
});

test('11 historial de quiz: miembros ven resultados, externos no', async () => {
  // dave sigue sin ser miembro
  const daveLogin = await api('/login', { method: 'POST', body: JSON.stringify({ username: 'dave', password: 'clave-dave-12345' }) });
  const daveToken = (await daveLogin.json()).token;

  const forbidden = await api('/recordings/ai/quiz-test-1/results', { headers: auth(daveToken) });
  assert.equal(forbidden.status, 403);

  const submitForbidden = await api('/recordings/ai/quiz-test-1/quiz-results', {
    method: 'POST', headers: auth(daveToken), body: JSON.stringify({ answers: [1, 0] }),
  });
  assert.equal(submitForbidden.status, 403);

  const history = await (await api('/recordings/ai/quiz-test-1/results', { headers: auth(state.token) })).json();
  assert.equal(history.results.length, 2);
  assert.equal(history.results[0].username, 'bob'); // más reciente primero
  assert.equal(history.results[0].score, 1);
  assert.equal(history.results[1].username, 'root');
  assert.equal(history.results[1].score, 2);
});

test('12 el quiz aparece en GET /groups/:id/ai y el job codificado valida membresía', async () => {
  const ai = await (await api(`/recordings/groups/${state.groupId}/ai?kind=quiz`, { headers: auth(state.token) })).json();
  assert.equal(ai.items.length, 1);
  assert.equal(ai.items[0].kind, 'quiz');
  assert.equal(ai.items[0].payload.questions.length, 2);

  const { insertRecordingJob } = await import('../src/db.js');
  insertRecordingJob('job-quiz-1', 'quiz', `${state.groupId}|8`);

  const daveLogin = await api('/login', { method: 'POST', body: JSON.stringify({ username: 'dave', password: 'clave-dave-12345' }) });
  const daveToken = (await daveLogin.json()).token;
  const forbidden = await api('/recordings/jobs/job-quiz-1', { headers: auth(daveToken) });
  assert.equal(forbidden.status, 403);

  const ok = await api('/recordings/jobs/job-quiz-1', { headers: auth(state.token) });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).job.type, 'quiz');
});
