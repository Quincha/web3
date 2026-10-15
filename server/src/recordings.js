// Grabaciones colaborativas: grupos con membresía, subida binaria de audio y
// documentos, contribuciones (notas), timeline unificada y SSE por miembro.
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';
import {
  DATA_DIR, getUserByToken, getUserByUsername,
  createRecordingGroup, getRecordingGroup, listRecordingGroupsForUser,
  updateRecordingGroup, deleteRecordingGroup,
  addRecordingGroupMember, listRecordingGroupMembers, getRecordingGroupMember,
  removeRecordingGroupMember,
  insertRecordingAsset, getRecordingAsset, sumGroupAssetSize, softDeleteRecordingAsset,
  listGroupAssetPaths,
  insertRecordingContribution, getRecordingContribution,
  updateRecordingContribution, deleteRecordingContribution,
  listRecordingTimeline, insertRecordingAudit,
  insertRecordingJob, getRecordingJob, claimNextRecordingJob, finishRecordingJob,
  upsertRecordingTranscript, getRecordingTranscriptByAsset,
  insertRecordingAi, getRecordingAi, listRecordingAiByGroup, listGroupTextCorpus,
  insertRecordingQuizResult, listRecordingQuizResults,
} from './db.js';
import { geminiConfigured, geminiTranscribe, geminiSummarize, geminiQuiz, geminiModel } from './recordingsAi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads', 'recordings');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ASSET_MAX_BYTES = 25 * 1024 * 1024; // 25 MB por archivo
const GROUP_MAX_BYTES = 500 * 1024 * 1024; // 500 MB por grupo
const UPLOAD_BODY_LIMIT = '30mb';

const AUDIO_MIMES = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
};
const DOC_MIMES = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const uuid = () => crypto.randomUUID();

function sanitizeFilename(name) {
  const base = path.basename(String(name || 'archivo')).replace(/[\\/:*?"<>|]+/g, '_').trim();
  return (base || 'archivo').slice(0, 180);
}

// --------------------------------------------------------------------------
// SSE por usuario (mismo patrón que gcal: ticket de un solo uso)
// --------------------------------------------------------------------------
const streamClients = new Map(); // userId -> Set<Response>
const streamNonces = new Map(); // nonce -> { token, expiresAt }
const NONCE_TTL_MS = 30 * 1000;

function notifyRecordingGroup(groupId, payload) {
  const members = listRecordingGroupMembers(groupId);
  const message = `data: ${JSON.stringify({ ...payload, groupId })}\n\n`;
  for (const m of members) {
    const set = streamClients.get(m.user_id);
    if (!set) continue;
    for (const res of Array.from(set)) {
      try { res.write(message); } catch { set.delete(res); }
    }
  }
}

function streamTicket(req, res) {
  const nonce = crypto.randomBytes(24).toString('hex');
  streamNonces.set(nonce, { token: req.token, expiresAt: Date.now() + NONCE_TTL_MS });
  res.json({ nonce });
}

function streamOpen(req, res) {
  const nonce = String(req.query.nonce || '');
  const entry = streamNonces.get(nonce);
  streamNonces.delete(nonce); // de un solo uso
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const user = getUserByToken(entry.token);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  let set = streamClients.get(user.id);
  if (!set) { set = new Set(); streamClients.set(user.id, set); }
  set.add(res);
  res.write('retry: 15000\n\n');
  res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { cleanup(); }
  }, 25000);

  function cleanup() {
    clearInterval(heartbeat);
    const s = streamClients.get(user.id);
    if (s) {
      s.delete(res);
      if (s.size === 0) streamClients.delete(user.id);
    }
  }
  res.on('close', cleanup);
  res.on('error', cleanup);
}

setInterval(() => {
  const now = Date.now();
  for (const [nonce, entry] of streamNonces) {
    if (entry.expiresAt < now) streamNonces.delete(nonce);
  }
}, 5 * 60 * 1000);

// --------------------------------------------------------------------------
// Permisos de grupo (owner / editor / viewer) — la autoridad es el servidor
// --------------------------------------------------------------------------
function loadGroup(req, res, next) {
  const group = getRecordingGroup(String(req.params.id || ''));
  if (!group) return res.status(404).json({ error: 'Grupo no encontrado' });
  const member = getRecordingGroupMember(group.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro de este grupo' });
  req.group = group;
  req.groupRole = member.role;
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.groupRole)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

function groupDto(g) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    ownerId: g.owner_id,
    role: g.role,
    memberCount: g.member_count,
    assetCount: g.asset_count,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  };
}

function memberDto(m) {
  return { userId: m.user_id, username: m.username, name: m.name, role: m.role, addedAt: m.added_at };
}

function assetDto(a) {
  return {
    id: a.id,
    groupId: a.group_id,
    kind: a.kind,
    filename: a.filename,
    mime: a.mime,
    size: a.size,
    durationMs: a.duration_ms,
    uploadedBy: a.uploaded_by,
    createdAt: a.created_at,
  };
}

function contributionDto(c) {
  return {
    id: c.id,
    groupId: c.group_id,
    authorId: c.author_id,
    kind: c.kind,
    body: c.body,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function jobDto(j) {
  return {
    id: j.id, type: j.type, status: j.status,
    error: j.error || null, attempts: j.attempts,
    createdAt: j.created_at, updatedAt: j.updated_at,
  };
}

function transcriptDto(t) {
  return {
    id: t.id, assetId: t.asset_id, text: t.text,
    source: t.source, status: t.status, createdAt: t.created_at,
  };
}

function aiDto(a) {
  let payload = {};
  try { payload = JSON.parse(a.payload_json); } catch { /* json roto */ }
  return { id: a.id, kind: a.kind, payload, model: a.model, createdAt: a.created_at };
}

// --------------------------------------------------------------------------
// Router
// --------------------------------------------------------------------------
export const recordingsRouter = express.Router();

// SSE antes del requireAuth global: /stream valida por nonce de un solo uso.
recordingsRouter.post('/streamticket', requireAuth, streamTicket);
recordingsRouter.get('/stream', streamOpen);
recordingsRouter.use(requireAuth);

// --- Grupos ---
recordingsRouter.get('/groups', (req, res) => {
  res.json({ ok: true, groups: listRecordingGroupsForUser(req.user.id).map(groupDto) });
});

recordingsRouter.post('/groups', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
  if (name.length > 120) return res.status(400).json({ error: 'El nombre del grupo es demasiado largo' });
  const group = createRecordingGroup(uuid(), name, description.slice(0, 2000), req.user.id);
  insertRecordingAudit(req.user.id, 'group.create', group.id, { name });
  res.status(201).json({
    ok: true,
    group: {
      id: group.id, name: group.name, description: group.description,
      ownerId: group.owner_id, createdAt: group.created_at, updatedAt: group.updated_at,
    },
  });
});

recordingsRouter.patch('/groups/:id', loadGroup, requireRoles('owner'), (req, res) => {
  const name = req.body?.name !== undefined ? String(req.body.name).trim() : req.group.name;
  const description = req.body?.description !== undefined
    ? String(req.body.description).trim().slice(0, 2000)
    : req.group.description;
  if (!name) return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
  const group = updateRecordingGroup(req.group.id, name.slice(0, 120), description);
  insertRecordingAudit(req.user.id, 'group.update', group.id, { name });
  res.json({
    ok: true,
    group: {
      id: group.id, name: group.name, description: group.description,
      ownerId: group.owner_id, createdAt: group.created_at, updatedAt: group.updated_at,
    },
  });
});

recordingsRouter.delete('/groups/:id', loadGroup, requireRoles('owner'), (req, res) => {
  const paths = listGroupAssetPaths(req.group.id).map((r) => r.storage_path);
  deleteRecordingGroup(req.group.id);
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch { /* ya no existe */ }
  }
  insertRecordingAudit(req.user.id, 'group.delete', req.group.id, { name: req.group.name });
  notifyRecordingGroup(req.group.id, { type: 'group', action: 'deleted' });
  res.json({ ok: true });
});

// --- Miembros ---
recordingsRouter.get('/groups/:id/members', loadGroup, (req, res) => {
  res.json({ ok: true, members: listRecordingGroupMembers(req.group.id).map(memberDto) });
});

recordingsRouter.post('/groups/:id/members', loadGroup, requireRoles('owner'), (req, res) => {
  const username = String(req.body?.username || '').trim();
  const role = String(req.body?.role || 'editor');
  if (!['owner', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido (owner, editor o viewer)' });
  }
  const user = getUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  addRecordingGroupMember(req.group.id, user.id, role);
  insertRecordingAudit(req.user.id, 'member.add', req.group.id, { username, role });
  notifyRecordingGroup(req.group.id, { type: 'members', action: 'changed' });
  const member = listRecordingGroupMembers(req.group.id).find((m) => m.user_id === user.id);
  res.status(201).json({ ok: true, member: memberDto(member) });
});

recordingsRouter.delete('/groups/:id/members/:userId', loadGroup, requireRoles('owner'), (req, res) => {
  const userId = Number(req.params.userId);
  const target = getRecordingGroupMember(req.group.id, userId);
  if (!target) return res.status(404).json({ error: 'Miembro no encontrado' });
  if (target.role === 'owner' && userId === req.group.owner_id) {
    return res.status(400).json({ error: 'No se puede quitar al propietario del grupo' });
  }
  removeRecordingGroupMember(req.group.id, userId);
  insertRecordingAudit(req.user.id, 'member.remove', req.group.id, { userId });
  notifyRecordingGroup(req.group.id, { type: 'members', action: 'changed' });
  res.json({ ok: true });
});

// --- Timeline ---
recordingsRouter.get('/groups/:id/timeline', loadGroup, (req, res) => {
  const since = Number(req.query.since) || 0;
  res.json({ ok: true, items: listRecordingTimeline(req.group.id, since) });
});

// --- Assets binarios (audio / documentos) ---
recordingsRouter.post(
  '/groups/:id/assets',
  loadGroup,
  requireRoles('owner', 'editor'),
  express.raw({ type: '*/*', limit: UPLOAD_BODY_LIMIT }),
  (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Archivo vacío o cuerpo binario faltante' });
    }
    const size = req.body.length;
    if (size > ASSET_MAX_BYTES) {
      return res.status(413).json({ error: 'El archivo supera el límite de 25 MB' });
    }
    const kind = req.query.kind === 'document' ? 'document' : 'audio';
    const mime = String(req.query.mime || '').toLowerCase();
    const allowed = kind === 'audio' ? AUDIO_MIMES : DOC_MIMES;
    const ext = allowed[mime];
    if (!ext) {
      return res.status(400).json({ error: `Tipo de archivo no permitido para ${kind}: ${mime || '(vacío)'}` });
    }
    if (sumGroupAssetSize(req.group.id) + size > GROUP_MAX_BYTES) {
      return res.status(413).json({ error: 'El grupo alcanzó su límite de 500 MB' });
    }

    const id = uuid();
    const filename = sanitizeFilename(req.query.filename || `grabacion.${ext}`);
    const storagePath = path.join(UPLOAD_DIR, `${id}.${ext}`);
    const durationMs = Number(req.query.durationMs) > 0 ? Math.round(Number(req.query.durationMs)) : null;

    try {
      fs.writeFileSync(storagePath, req.body);
    } catch (err) {
      console.error('[recordings] upload write:', err);
      return res.status(500).json({ error: 'No se pudo guardar el archivo' });
    }

    const asset = insertRecordingAsset({
      id, groupId: req.group.id, kind, filename, mime, size,
      storagePath, durationMs, uploadedBy: req.user.id, createdAt: Date.now(),
    });
    insertRecordingAudit(req.user.id, 'asset.upload', asset.id, { filename, size });
    notifyRecordingGroup(req.group.id, { type: 'asset', action: 'created', item: assetDto(asset) });
    res.status(201).json({ ok: true, asset: assetDto(asset) });
  },
);

recordingsRouter.get('/assets/:id/file', (req, res) => {
  const asset = getRecordingAsset(String(req.params.id || ''));
  if (!asset || asset.deleted_at) return res.status(404).json({ error: 'Archivo no encontrado' });
  const member = getRecordingGroupMember(asset.group_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro de este grupo' });

  let size;
  try {
    size = fs.statSync(asset.storage_path).size;
  } catch {
    return res.status(404).json({ error: 'Archivo no encontrado en disco' });
  }

  const asciiName = asset.filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  res.setHeader('Content-Type', asset.mime);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(asset.filename)}`);

  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      let start = m[1] === '' ? size - 1 : Number(m[1]);
      let end = m[2] === '' ? size - 1 : Number(m[2]);
      if (m[1] === '' && m[2] !== '') { start = size - end; end = size - 1; }
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < size) {
        end = Math.min(end, size - 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        res.setHeader('Content-Length', String(end - start + 1));
        fs.createReadStream(asset.storage_path, { start, end }).pipe(res);
        return;
      }
    }
    res.setHeader('Content-Range', `bytes */${size}`);
    return res.status(416).end();
  }

  res.setHeader('Content-Length', String(size));
  fs.createReadStream(asset.storage_path).pipe(res);
});

recordingsRouter.delete('/assets/:id', (req, res) => {
  const asset = getRecordingAsset(String(req.params.id || ''));
  if (!asset || asset.deleted_at) return res.status(404).json({ error: 'Archivo no encontrado' });
  const member = getRecordingGroupMember(asset.group_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro de este grupo' });
  if (!['owner', 'editor'].includes(member.role) && asset.uploaded_by !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }
  softDeleteRecordingAsset(asset.id);
  try { fs.unlinkSync(asset.storage_path); } catch { /* ya no existe */ }
  insertRecordingAudit(req.user.id, 'asset.delete', asset.id, { filename: asset.filename });
  notifyRecordingGroup(asset.group_id, { type: 'asset', action: 'deleted', id: asset.id });
  res.json({ ok: true });
});

// --- Transcripciones (manual o vía Gemini) ---
function loadAssetForMember(req, res, next) {
  const asset = getRecordingAsset(String(req.params.id || ''));
  if (!asset || asset.deleted_at) return res.status(404).json({ error: 'Archivo no encontrado' });
  const member = getRecordingGroupMember(asset.group_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro de este grupo' });
  req.asset = asset;
  req.groupRole = member.role;
  next();
}

recordingsRouter.get('/assets/:id/transcript', loadAssetForMember, (req, res) => {
  const t = getRecordingTranscriptByAsset(req.asset.id);
  res.json({ ok: true, transcript: t ? transcriptDto(t) : null });
});

recordingsRouter.post('/assets/:id/transcript', loadAssetForMember, requireRoles('owner', 'editor'), (req, res) => {
  const text = req.body?.text !== undefined && req.body?.text !== null ? String(req.body.text).trim() : null;

  // Transcripción manual: guarda o reemplaza al instante.
  if (text !== null) {
    if (!text) return res.status(400).json({ error: 'La transcripción no puede estar vacía' });
    if (text.length > 200000) return res.status(400).json({ error: 'La transcripción es demasiado larga' });
    const t = upsertRecordingTranscript(uuid(), req.asset.id, req.asset.group_id, text, 'manual', req.user.id);
    insertRecordingAudit(req.user.id, 'transcript.save', req.asset.id, { source: 'manual' });
    notifyRecordingGroup(req.asset.group_id, { type: 'transcript', action: 'ready', assetId: req.asset.id });
    return res.json({ ok: true, transcript: transcriptDto(t) });
  }

  // Automática: encola un job (requiere GEMINI_API_KEY en el servidor).
  if (!geminiConfigured()) {
    return res.status(503).json({
      error: 'La transcripción automática no está configurada en el servidor (falta GEMINI_API_KEY). Puedes pegar la transcripción manualmente.',
    });
  }
  const job = insertRecordingJob(uuid(), 'transcribe', req.asset.id);
  res.status(202).json({ ok: true, jobId: job.id, job: jobDto(job) });
});

// --- Jobs de IA (estado para el cliente) ---
recordingsRouter.get('/jobs/:id', (req, res) => {
  const job = getRecordingJob(String(req.params.id || ''));
  if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
  let groupId;
  if (job.type === 'transcribe') {
    const asset = getRecordingAsset(job.target_id);
    if (!asset) return res.status(404).json({ error: 'Archivo no encontrado' });
    groupId = asset.group_id;
  } else {
    // summarize: groupId plano; quiz: "groupId|count"
    groupId = String(job.target_id).split('|')[0];
  }
  if (!getRecordingGroupMember(groupId, req.user.id)) {
    return res.status(403).json({ error: 'No eres miembro de este grupo' });
  }
  res.json({ ok: true, job: jobDto(job) });
});

// --- Artefactos IA (resumen y cuestionario) ---
recordingsRouter.post('/groups/:id/ai/summary', loadGroup, requireRoles('owner', 'editor'), (req, res) => {
  if (!geminiConfigured()) {
    return res.status(503).json({
      error: 'El resumen con IA no está configurado en el servidor (falta GEMINI_API_KEY).',
    });
  }
  const job = insertRecordingJob(uuid(), 'summarize', req.group.id);
  res.status(202).json({ ok: true, jobId: job.id, job: jobDto(job) });
});

recordingsRouter.get('/groups/:id/ai', loadGroup, (req, res) => {
  const kind = req.query.kind === 'summary' || req.query.kind === 'quiz' ? req.query.kind : null;
  res.json({ ok: true, items: listRecordingAiByGroup(req.group.id, kind).map(aiDto) });
});

// --- Cuestionario IA (F3) ---
// El target del job codifica "groupId|count" para no tocar el esquema de jobs.
recordingsRouter.post('/groups/:id/ai/quiz', loadGroup, requireRoles('owner', 'editor'), (req, res) => {
  if (!geminiConfigured()) {
    return res.status(503).json({
      error: 'El cuestionario con IA no está configurado en el servidor (falta GEMINI_API_KEY).',
    });
  }
  const count = Math.max(3, Math.min(15, Math.round(Number(req.body?.count) || 8)));
  const job = insertRecordingJob(uuid(), 'quiz', `${req.group.id}|${count}`);
  res.status(202).json({ ok: true, jobId: job.id, job: jobDto(job) });
});

function loadQuizAi(req, res, next) {
  const item = getRecordingAi(String(req.params.aiId || ''));
  if (!item || item.kind !== 'quiz') return res.status(404).json({ error: 'Cuestionario no encontrado' });
  if (!getRecordingGroupMember(item.group_id, req.user.id)) {
    return res.status(403).json({ error: 'No eres miembro de este grupo' });
  }
  req.quizAi = item;
  next();
}

recordingsRouter.post('/ai/:aiId/quiz-results', loadQuizAi, (req, res) => {
  let payload = {};
  try { payload = JSON.parse(req.quizAi.payload_json); } catch { /* json roto */ }
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (questions.length === 0) {
    return res.status(400).json({ error: 'El cuestionario no tiene preguntas válidas' });
  }
  const answers = Array.isArray(req.body?.answers) ? req.body.answers.map(Number) : null;
  if (!answers || answers.length !== questions.length) {
    return res.status(400).json({ error: `Se esperaban ${questions.length} respuestas` });
  }
  for (let i = 0; i < answers.length; i += 1) {
    const a = answers[i];
    const optionCount = Array.isArray(questions[i].options) ? questions[i].options.length : 0;
    if (!Number.isInteger(a) || a < 0 || a >= optionCount) {
      return res.status(400).json({ error: `Respuesta inválida en la pregunta ${i + 1}` });
    }
  }
  let score = 0;
  for (let i = 0; i < questions.length; i += 1) {
    if (answers[i] === Number(questions[i].answer)) score += 1;
  }
  const result = insertRecordingQuizResult(uuid(), req.quizAi.id, req.user.id, score, questions.length, answers);
  insertRecordingAudit(req.user.id, 'quiz.submit', req.quizAi.id, { score, total: questions.length });
  res.status(201).json({
    ok: true,
    result: { id: result.id, score, total: questions.length, createdAt: result.created_at },
  });
});

recordingsRouter.get('/ai/:aiId/results', loadQuizAi, (req, res) => {
  const rows = listRecordingQuizResults(req.quizAi.id).map((r) => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    name: r.name,
    score: r.score,
    total: r.total,
    createdAt: r.created_at,
  }));
  res.json({ ok: true, results: rows });
});

// --- Contribuciones (notas / comentarios) ---
recordingsRouter.post('/groups/:id/contributions', loadGroup, requireRoles('owner', 'editor'), (req, res) => {
  const kind = req.body?.kind === 'comment' ? 'comment' : 'note';
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'La nota no puede estar vacía' });
  if (body.length > 10000) return res.status(400).json({ error: 'La nota es demasiado larga (máx. 10.000 caracteres)' });
  const contribution = insertRecordingContribution(uuid(), req.group.id, req.user.id, kind, body);
  insertRecordingAudit(req.user.id, 'contribution.create', contribution.id, { kind });
  notifyRecordingGroup(req.group.id, { type: 'contribution', action: 'created', item: contributionDto(contribution) });
  res.status(201).json({ ok: true, contribution: contributionDto(contribution) });
});

function loadContribution(req, res, next) {
  const c = getRecordingContribution(String(req.params.id || ''));
  if (!c) return res.status(404).json({ error: 'Contribución no encontrada' });
  const member = getRecordingGroupMember(c.group_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro de este grupo' });
  req.contribution = c;
  req.groupRole = member.role;
  next();
}

function requireAuthorOrOwner(req, res, next) {
  if (req.contribution.author_id === req.user.id || req.groupRole === 'owner') return next();
  return res.status(403).json({ error: 'No tienes permisos para esta acción' });
}

recordingsRouter.patch('/contributions/:id', loadContribution, requireAuthorOrOwner, (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'La nota no puede estar vacía' });
  if (body.length > 10000) return res.status(400).json({ error: 'La nota es demasiado larga (máx. 10.000 caracteres)' });
  const updated = updateRecordingContribution(req.contribution.id, body);
  insertRecordingAudit(req.user.id, 'contribution.update', updated.id, {});
  notifyRecordingGroup(updated.group_id, { type: 'contribution', action: 'updated', item: contributionDto(updated) });
  res.json({ ok: true, contribution: contributionDto(updated) });
});

recordingsRouter.delete('/contributions/:id', loadContribution, requireAuthorOrOwner, (req, res) => {
  deleteRecordingContribution(req.contribution.id);
  insertRecordingAudit(req.user.id, 'contribution.delete', req.contribution.id, {});
  notifyRecordingGroup(req.contribution.group_id, { type: 'contribution', action: 'deleted', id: req.contribution.id });
  res.json({ ok: true });
});

// --------------------------------------------------------------------------
// Worker de jobs (un solo proceso, estilo intervalos de gcal). Transcripción,
// resumen y cuestionario contra Gemini; los resultados se notifican por SSE.
// --------------------------------------------------------------------------
let jobRunning = false;

async function runRecordingJob(job) {
  if (job.type === 'transcribe') {
    const asset = getRecordingAsset(job.target_id);
    if (!asset || asset.deleted_at) throw new Error('El archivo ya no existe');
    let buf;
    try {
      buf = fs.readFileSync(asset.storage_path);
    } catch {
      throw new Error('No se pudo leer el archivo en disco');
    }
    const text = await geminiTranscribe(buf, asset.mime);
    upsertRecordingTranscript(uuid(), asset.id, asset.group_id, text, 'gemini', asset.uploaded_by);
    finishRecordingJob(job.id, 'done');
    notifyRecordingGroup(asset.group_id, { type: 'job', action: 'done', jobId: job.id, kind: 'transcribe' });
    notifyRecordingGroup(asset.group_id, { type: 'transcript', action: 'ready', assetId: asset.id });
    return;
  }

  if (job.type === 'summarize') {
    const group = getRecordingGroup(job.target_id);
    if (!group) throw new Error('Grupo no encontrado');
    const corpus = listGroupTextCorpus(group.id)
      .map((c) => c.text)
      .join('\n---\n')
      .trim();
    if (!corpus) throw new Error('No hay notas ni transcripciones para resumir');
    const summary = await geminiSummarize(corpus.slice(0, 400000));
    insertRecordingAi(uuid(), group.id, 'summary', { markdown: summary }, geminiModel());
    finishRecordingJob(job.id, 'done');
    notifyRecordingGroup(group.id, { type: 'job', action: 'done', jobId: job.id, kind: 'summarize' });
    notifyRecordingGroup(group.id, { type: 'ai', action: 'created', kind: 'summary' });
    return;
  }

  if (job.type === 'quiz') {
    const [groupId, countStr] = String(job.target_id).split('|');
    const group = getRecordingGroup(groupId);
    if (!group) throw new Error('Grupo no encontrado');
    const corpus = listGroupTextCorpus(group.id)
      .map((c) => c.text)
      .join('\n---\n')
      .trim();
    if (!corpus) throw new Error('No hay notas ni transcripciones para generar el cuestionario');
    const quiz = await geminiQuiz(corpus, Number(countStr) || 8);
    insertRecordingAi(uuid(), group.id, 'quiz', quiz, geminiModel());
    finishRecordingJob(job.id, 'done');
    notifyRecordingGroup(group.id, { type: 'job', action: 'done', jobId: job.id, kind: 'quiz' });
    notifyRecordingGroup(group.id, { type: 'ai', action: 'created', kind: 'quiz' });
    return;
  }

  throw new Error(`Tipo de trabajo desconocido: ${job.type}`);
}

async function processRecordingJobs() {
  if (jobRunning) return;
  const job = claimNextRecordingJob();
  if (!job) return;
  jobRunning = true;
  try {
    await runRecordingJob(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[recordings] job ${job.type} falló:`, message);
    finishRecordingJob(job.id, 'failed', message);
    let groupId = null;
    if (job.type === 'summarize') {
      groupId = job.target_id;
    } else if (job.type === 'quiz') {
      groupId = String(job.target_id).split('|')[0] || null;
    } else {
      groupId = getRecordingAsset(job.target_id)?.group_id || null;
    }
    if (groupId) {
      notifyRecordingGroup(groupId, { type: 'job', action: 'failed', jobId: job.id, kind: job.type, error: message });
    }
  } finally {
    jobRunning = false;
  }
}

// En tests se desactiva (QUINCHA_RECORDINGS_WORKER=0) para no competir con la
// verificación directa de la cola.
if (process.env.QUINCHA_RECORDINGS_WORKER !== '0') {
  setInterval(() => {
    processRecordingJobs().catch((err) => console.error('[recordings] worker:', err));
  }, 2000);
}
