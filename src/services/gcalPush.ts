import { API_BASE } from './config';
import { Api, getToken } from './ApiClient';
import { isTauriRuntime } from './http';

type Listener = () => void;

const listeners = new Set<Listener>();
let es: EventSource | null = null;

function notify() {
  for (const l of Array.from(listeners)) {
    try {
      l();
    } catch {
      /* no romper el resto de listeners */
    }
  }
}

async function openStream() {
  const token = getToken();
  if (!token || es) return;
  // EventSource no funciona dentro del webview de Tauri (SSE no soportado por
  // el plugin HTTP nativo); en desktop se usa polling de gcalEvents en su lugar.
  if (isTauriRuntime()) return;
  try {
    // EventSource no admite headers, así que pedimos un nonce de un solo uso con
    // la sesión y abrimos el stream con ese nonce (el token nunca va en la URL).
    const { nonce } = await Api.gcalStreamTicket();
    const src = new EventSource(`${API_BASE}/gcal/stream?nonce=${encodeURIComponent(nonce)}`);
    src.addEventListener('message', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data || '{}');
        if (data.type === 'refresh') notify();
      } catch {
        /* payload no JSON */
      }
    });
    src.addEventListener('open', notify);
    es = src;
  } catch {
    es = null;
  }
}

function closeStream() {
  if (!es) return;
  es.close();
  es = null;
}

// Devuelve una función "unsuscribe". Mientras haya al menos un suscriptor, se
// mantiene abierta la conexión SSE única con el servidor.
export function subscribeGcalPush(onRefresh: () => void): () => void {
  listeners.add(onRefresh);
  openStream();
  return () => {
    listeners.delete(onRefresh);
    if (listeners.size === 0) closeStream();
  };
}