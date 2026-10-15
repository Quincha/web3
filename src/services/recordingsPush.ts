// Tiempo real del módulo Grabaciones: SSE por usuario (ticket de un solo uso,
// igual que gcal). En Tauri el SSE no funciona → polling corto como fallback.
import { API_BASE } from './config';
import { RecordingsApi } from './RecordingsApi';
import { getToken } from './ApiClient';
import { isTauriRuntime } from './http';

type Listener = (payload: { type?: string; action?: string; groupId?: string; assetId?: string; jobId?: string }) => void;

const listeners = new Set<Listener>();
let es: EventSource | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function notify(payload: { type?: string; action?: string; groupId?: string }) {
  for (const l of Array.from(listeners)) {
    try {
      l(payload);
    } catch {
      /* no romper el resto */
    }
  }
}

async function openStream() {
  const token = getToken();
  if (!token || es || isTauriRuntime()) return;
  try {
    const { nonce } = await RecordingsApi.streamTicket();
    const src = new EventSource(`${API_BASE}/recordings/stream?nonce=${encodeURIComponent(nonce)}`);
    src.addEventListener('message', (e) => {
      try {
        notify(JSON.parse((e as MessageEvent).data || '{}'));
      } catch {
        /* payload no JSON */
      }
    });
    es = src;
  } catch {
    es = null;
  }
}

function closeStream() {
  if (es) {
    es.close();
    es = null;
  }
}

function startPolling() {
  if (pollTimer) return;
  // Fallback para Tauri (y redos donde el SSE falle): refresco suave.
  pollTimer = setInterval(() => notify({ type: 'poll' }), 10 * 1000);
}

function stopAll() {
  closeStream();
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Devuelve unsubscribe. Mientras haya suscriptores se mantiene el stream. */
export function subscribeRecordings(onEvent: Listener): () => void {
  listeners.add(onEvent);
  openStream();
  if (isTauriRuntime()) startPolling();
  return () => {
    listeners.delete(onEvent);
    if (listeners.size === 0) stopAll();
  };
}

/** Cierra el stream al cerrar sesión (se llama desde logout del módulo). */
export function resetRecordingsPush() {
  stopAll();
  listeners.clear();
}

export type { Listener as RecordingsPushListener };
