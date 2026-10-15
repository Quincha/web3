// Cliente HTTP del módulo Grabaciones Colaborativas.
// La subida de archivos usa body binario (fetch/Tauri aceptan ArrayBuffer),
// no multipart (el server valida mime y tamaño con express.raw).
import { API_BASE } from './config';
import { getToken } from './ApiClient';
import { httpFetch } from './http';

export interface RecordingGroup {
  id: string;
  name: string;
  description: string;
  ownerId: number;
  role?: 'owner' | 'editor' | 'viewer';
  memberCount?: number;
  assetCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecordingMember {
  userId: number;
  username: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: number;
}

export interface RecordingAsset {
  id: string;
  groupId: string;
  kind: 'audio' | 'document';
  filename: string;
  mime: string;
  size: number;
  durationMs: number | null;
  uploadedBy: number;
  createdAt: number;
}

export interface RecordingContribution {
  id: string;
  groupId: string;
  authorId: number;
  kind: 'note' | 'comment';
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface TimelineItem {
  type: 'asset' | 'contribution';
  id: string;
  createdAt: number;
  author: { id: number; username: string; name: string };
  asset?: { kind: 'audio' | 'document'; filename: string; mime: string; size: number; durationMs: number | null };
  contribution?: { kind: 'note' | 'comment'; body: string; updatedAt: number };
}

export interface RecordingTranscript {
  id: string;
  assetId: string;
  text: string;
  source: 'gemini' | 'manual';
  status: 'pending' | 'ready' | 'failed';
  createdAt: number;
}

export interface RecordingJob {
  id: string;
  type: 'transcribe' | 'summarize' | 'quiz';
  status: 'queued' | 'running' | 'done' | 'failed';
  error: string | null;
  attempts: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecordingAiItem {
  id: string;
  kind: 'summary' | 'quiz';
  payload: { markdown?: string; questions?: QuizQuestion[]; [k: string]: unknown };
  model: string;
  createdAt: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface QuizResultRow {
  id: string;
  userId: number;
  username: string;
  name: string;
  score: number;
  total: number;
  createdAt: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof ArrayBuffer) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await httpFetch(`${API_BASE}/recordings${path}`, { ...options, headers });
  } catch {
    throw new Error('Error de conexión: no se pudo conectar con el servidor');
  }
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* cuerpo no JSON */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const RecordingsApi = {
  listGroups(): Promise<{ ok: boolean; groups: RecordingGroup[] }> {
    return request('/groups');
  },

  createGroup(name: string, description = ''): Promise<{ ok: boolean; group: RecordingGroup }> {
    return request('/groups', { method: 'POST', body: JSON.stringify({ name, description }) });
  },

  updateGroup(id: string, patch: { name?: string; description?: string }): Promise<{ ok: boolean; group: RecordingGroup }> {
    return request(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  deleteGroup(id: string): Promise<{ ok: boolean }> {
    return request(`/groups/${id}`, { method: 'DELETE' });
  },

  listMembers(groupId: string): Promise<{ ok: boolean; members: RecordingMember[] }> {
    return request(`/groups/${groupId}/members`);
  },

  addMember(groupId: string, username: string, role: 'editor' | 'viewer' | 'owner'):
    Promise<{ ok: boolean; member: RecordingMember }> {
    return request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ username, role }) });
  },

  removeMember(groupId: string, userId: number): Promise<{ ok: boolean }> {
    return request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  timeline(groupId: string, since = 0): Promise<{ ok: boolean; items: TimelineItem[] }> {
    return request(`/groups/${groupId}/timeline?since=${since}`);
  },

  uploadAsset(groupId: string, file: Blob, meta: { filename: string; mime: string; kind: 'audio' | 'document'; durationMs?: number }):
    Promise<{ ok: boolean; asset: RecordingAsset }> {
    const qs = new URLSearchParams({
      filename: meta.filename,
      mime: meta.mime,
      kind: meta.kind,
      ...(meta.durationMs ? { durationMs: String(meta.durationMs) } : {}),
    }).toString();
    return request(`/groups/${groupId}/assets?${qs}`, {
      method: 'POST',
      body: file, // Blob se envía como binario puro (Content-Type lo pone el header)
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  },

  assetFileUrl(assetId: string): string {
    return `${API_BASE}/recordings/assets/${assetId}/file`;
  },

  /** Descarga el blob autenticado (para <audio>: no puede llevar headers). */
  async fetchAssetBlob(assetId: string): Promise<Blob> {
    const token = getToken();
    const res = await httpFetch(`${API_BASE}/recordings/assets/${assetId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('No se pudo cargar el archivo');
    return res.blob();
  },

  async downloadAsset(assetId: string, filename: string): Promise<void> {
    const token = getToken();
    const res = await httpFetch(`${API_BASE}/recordings/assets/${assetId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('No se pudo descargar el archivo');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  deleteAsset(assetId: string): Promise<{ ok: boolean }> {
    return request(`/assets/${assetId}`, { method: 'DELETE' });
  },

  addContribution(groupId: string, body: string, kind: 'note' | 'comment' = 'note'):
    Promise<{ ok: boolean; contribution: RecordingContribution }> {
    return request(`/groups/${groupId}/contributions`, { method: 'POST', body: JSON.stringify({ kind, body }) });
  },

  updateContribution(id: string, body: string): Promise<{ ok: boolean; contribution: RecordingContribution }> {
    return request(`/contributions/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
  },

  deleteContribution(id: string): Promise<{ ok: boolean }> {
    return request(`/contributions/${id}`, { method: 'DELETE' });
  },

  // --- IA (F2/F3): transcripción, resumen y cuestionario ---
  getTranscript(assetId: string): Promise<{ ok: boolean; transcript: RecordingTranscript | null }> {
    return request(`/assets/${assetId}/transcript`);
  },

  /** Transcripción manual: guarda o reemplaza al instante. */
  saveTranscript(assetId: string, text: string): Promise<{ ok: boolean; transcript: RecordingTranscript }> {
    return request(`/assets/${assetId}/transcript`, { method: 'POST', body: JSON.stringify({ text }) });
  },

  /** Transcripción automática: encola un job (requiere GEMINI_API_KEY en el server). */
  requestTranscript(assetId: string): Promise<{ ok: boolean; jobId: string; job: RecordingJob }> {
    return request(`/assets/${assetId}/transcript`, { method: 'POST', body: JSON.stringify({}) });
  },

  requestSummary(groupId: string): Promise<{ ok: boolean; jobId: string; job: RecordingJob }> {
    return request(`/groups/${groupId}/ai/summary`, { method: 'POST', body: JSON.stringify({}) });
  },

  requestQuiz(groupId: string, count = 8): Promise<{ ok: boolean; jobId: string; job: RecordingJob }> {
    return request(`/groups/${groupId}/ai/quiz`, { method: 'POST', body: JSON.stringify({ count }) });
  },

  submitQuizResults(aiId: string, answers: number[]):
    Promise<{ ok: boolean; result: { id: string; score: number; total: number; createdAt: number } }> {
    return request(`/ai/${aiId}/quiz-results`, { method: 'POST', body: JSON.stringify({ answers }) });
  },

  listQuizResults(aiId: string): Promise<{ ok: boolean; results: QuizResultRow[] }> {
    return request(`/ai/${aiId}/results`);
  },

  getJob(jobId: string): Promise<{ ok: boolean; job: RecordingJob }> {
    return request(`/jobs/${jobId}`);
  },

  listAi(groupId: string, kind?: 'summary' | 'quiz'): Promise<{ ok: boolean; items: RecordingAiItem[] }> {
    return request(`/groups/${groupId}/ai${kind ? `?kind=${kind}` : ''}`);
  },

  streamTicket(): Promise<{ nonce: string }> {
    return request('/streamticket', { method: 'POST' });
  },
};
