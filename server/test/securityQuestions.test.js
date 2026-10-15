import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, cleanupDb } from './helpers/setup.js';

let server;
let base;
const state = { token: null };

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

test('01 setup: install', async () => {
  const install = await api('/install', {
    method: 'POST',
    body: JSON.stringify({ username: 'root', password: 'clave-segura-123', name: 'Root' }),
  });
  assert.equal(install.status, 201);
  state.token = (await install.json()).token;
});

test('02 guardar preguntas de seguridad (2-3)', async () => {
  const ok = await api('/security-questions', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({
      questions: [
        { question: '¿Nombre de tu primera mascota?', answer: 'Firulais' },
        { question: '¿Ciudad de nacimiento?', answer: 'Santiago' },
      ],
    }),
  });
  assert.equal(ok.status, 200);

  // demasiado pocas
  const few = await api('/security-questions', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ questions: [{ question: '¿Color favorito?', answer: 'azul' }] }),
  });
  assert.equal(few.status, 400);

  // respuesta vacía
  const empty = await api('/security-questions', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({
      questions: [
        { question: '¿P1?', answer: 'a' },
        { question: '¿P2?', answer: '' },
      ],
    }),
  });
  assert.equal(empty.status, 400);
});

test('03 GET security-questions devuelve preguntas sin respuestas', async () => {
  const res = await (await api('/security-questions?username=root')).json();
  assert.equal(res.ok, true);
  assert.equal(res.questions.length, 2);
  assert.equal(res.questions[0].question, '¿Nombre de tu primera mascota?');
  // no debe exponer hashes ni userId
  assert.equal(res.userId, undefined);
  assert.equal(res.questions[0].answer, undefined);
  assert.equal(res.questions[0].answer_hash, undefined);
});

test('04 GET security-questions para usuario inexistente → 404', async () => {
  const res = await api('/security-questions?username=noexiste');
  assert.equal(res.status, 404);
});

test('05 forgot-password con respuestas correctas → 200 y cambia contraseña', async () => {
  const res = await api('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      username: 'root',
      answers: ['Firulais', 'Santiago'],
      newPassword: 'nueva-clave-456',
    }),
  });
  assert.equal(res.status, 200);

  // login con contraseña vieja falla
  const oldLogin = await api('/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'root', password: 'clave-segura-123' }),
  });
  assert.equal(oldLogin.status, 401);

  // login con contraseña nueva funciona
  const newLogin = await api('/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'root', password: 'nueva-clave-456' }),
  });
  assert.equal(newLogin.status, 200);
  state.token = (await newLogin.json()).token;
});

test('06 forgot-password con respuestas incorrectas → 403', async () => {
  const res = await api('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      username: 'root',
      answers: ['Firulais', 'Otra ciudad'],
      newPassword: 'otra-clave-789',
    }),
  });
  assert.equal(res.status, 403);
});

test('07 forgot-password con contraseña corta → 400', async () => {
  const res = await api('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      username: 'root',
      answers: ['Firulais', 'Santiago'],
      newPassword: 'corta',
    }),
  });
  assert.equal(res.status, 400);
});

test('08 admin reset-password cambia contraseña de otro usuario', async () => {
  // crear usuario bob
  const create = await api('/users', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ username: 'bob', password: 'bob-pass-123', role: 'user', name: 'Bob' }),
  });
  assert.equal(create.status, 201);
  const bobId = (await create.json()).user.id;

  // super-admin resetea bob
  const reset = await api('/admin/reset-password', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ userId: bobId, newPassword: 'bob-nueva-456' }),
  });
  assert.equal(reset.status, 200);

  // bob entra con la nueva
  const login = await api('/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'bob', password: 'bob-nueva-456' }),
  });
  assert.equal(login.status, 200);
});

test('09 admin reset-password valida longitud y usuario', async () => {
  // usuario existente + contraseña corta → 400
  const short = await api('/admin/reset-password', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ userId: 1, newPassword: 'corta' }),
  });
  assert.equal(short.status, 400);

  // usuario inexistente → 404
  const notFound = await api('/admin/reset-password', {
    method: 'POST',
    headers: auth(state.token),
    body: JSON.stringify({ userId: 9999, newPassword: 'clave-larga-123' }),
  });
  assert.equal(notFound.status, 404);
});
