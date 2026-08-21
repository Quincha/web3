import { API_BASE } from './config';
import { storage } from './storage';
import { httpFetch } from './http';

const TOKEN_KEY = 'q_token';
const PROFILE_KEY = 'q_profile';

export interface AuthUser {
  username: string;
  role: string;
  name: string;
}

export interface SavedDesign {
  id: string;
  name: string;
  format: string;
  stitches: number;
  colorCount?: number;
  colors?: { hex: string }[];
  createdAt?: number;
}

export interface DesignPreview {
  dataUrl: string;
  width: number;
  height: number;
}

function getToken(): string | null {
  return storage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) storage.setItem(TOKEN_KEY, token);
  else storage.removeItem(TOKEN_KEY);
}

function getProfile(): AuthUser | null {
  try {
    const raw = storage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setProfile(profile: AuthUser | null) {
  if (profile) storage.setItem(PROFILE_KEY, JSON.stringify(profile));
  else storage.removeItem(PROFILE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, withAuth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (withAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await httpFetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Error de conexión: no se pudo conectar con el servidor');
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Upload multipart (campo "file"). No fija Content-Type: el boundary lo pone el runtime. */
async function requestUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append('file', file, file.name);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await httpFetch(`${API_BASE}${path}`, { method: 'POST', body, headers });
  } catch {
    throw new ApiError(0, 'Error de conexión: no se pudo conectar con el servidor');
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const b = await res.json();
      if (b && b.error) message = b.error;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const Api = {
  isAuthenticated(): boolean {
    return !!getToken();
  },

  getProfile(): AuthUser | null {
    return getProfile();
  },

  async health(): Promise<{ ok: boolean; setupRequired: boolean }> {
    return request('/health', {}, false);
  },

  async install(username: string, password: string, name: string): Promise<{ ok: boolean; token: string }> {
    return request('/install', { method: 'POST', body: JSON.stringify({ username, password, name }) }, false);
  },

  async login(username: string, password: string): Promise<{ ok: boolean; token: string; user: AuthUser }> {
    const res = await request<{ ok: boolean; token: string; user: AuthUser }>(
      '/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
      false,
    );
    setToken(res.token);
    setProfile(res.user);
    return res;
  },

  async me(): Promise<AuthUser> {
    const me = await request<AuthUser>('/me');
    setProfile(me);
    return me;
  },

  async changePassword(current: string, next: string): Promise<void> {
    await request('/password', { method: 'POST', body: JSON.stringify({ current, next }) });
  },

  async logout(): Promise<void> {
    try {
      await request('/logout', { method: 'POST' });
    } finally {
      setToken(null);
      setProfile(null);
    }
  },

  async getConfig(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/config');
  },

  async saveConfig(config: object): Promise<void> {
    await request('/config', { method: 'PUT', body: JSON.stringify(config) });
  },

  async sync(entries: { key: string; data: unknown; updatedAt?: number }[]): Promise<{ key: string; data: unknown }[]> {
    const res = await request<{ db: { key: string; data: unknown }[] }>(
      '/sync',
      { method: 'POST', body: JSON.stringify({ entries }) },
    );
    return res.db;
  },

  async fetchSync(): Promise<{ key: string; data: unknown }[]> {
    const res = await request<{ db: { key: string; data: unknown }[] }>('/sync');
    return res.db;
  },

  // Google Calendar
  async gcalStatus(): Promise<{ configured: boolean; connected: boolean; profile: unknown; calName: string | null }> {
    return request('/gcal/status');
  },

  /** Obtiene la URL de autorización de Google (autenticada) para redirigir la pestaña. */
  async gcalAuthUrl(): Promise<{ url: string }> {
    return request<{ url: string }>('/gcal/auth');
  },

  async gcalDisconnect(): Promise<void> {
    await request('/gcal/disconnect', { method: 'POST' });
  },

  /** Ticket de un solo uso para abrir el stream SSE sin exponer el token en la URL. */
  async gcalStreamTicket(): Promise<{ nonce: string }> {
    return request<{ nonce: string }>('/gcal/streamticket', { method: 'POST' });
  },

  async gcalEvents(days = 60): Promise<{ connected: boolean; items: unknown[]; error?: string }> {
    return request(`/gcal/events?days=${days}`);
  },

  async gcalCreateEvent(payload: {
    summary: string;
    start: string;
    end?: string;
    allDay?: boolean;
    description?: string;
    location?: string;
    timeZone?: string;
  }): Promise<{ ok: boolean; id?: string }> {
    return request('/gcal/event', { method: 'POST', body: JSON.stringify(payload) });
  },

  async gcalUpdateEvent(eventId: string, payload: {
    start: string;
    end?: string;
    allDay?: boolean;
    summary?: string;
    timeZone?: string;
  }): Promise<{ ok: boolean; id?: string }> {
    return request(`/gcal/event/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  async gcalDeleteEvent(eventId: string): Promise<{ ok: boolean }> {
    return request(`/gcal/event/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  },

  async gcalClear(prefix = ''): Promise<{ ok: boolean; removed?: number }> {
    return request('/gcal/clear', { method: 'POST', body: JSON.stringify({ prefix }) });
  },

  // Diseños de bordado (JEF / DST / PES)
  async designMeta(file: File): Promise<{ ok: boolean; name: string; format: string; stitches: number; colorCount: number; colors: { hex: string }[] }> {
    return requestUpload('/design/meta', file);
  },

  async designPreview(file: File, size = 512, mode: 'bordado' | 'puntos' = 'puntos'): Promise<DesignPreview> {
    return requestUpload(`/design/preview?size=${size}&mode=${mode}`, file);
  },

  async designSave(file: File): Promise<{ ok: boolean; design: SavedDesign; preview: DesignPreview }> {
    return requestUpload('/design/save', file);
  },

  async designList(): Promise<{ ok: boolean; designs: SavedDesign[] }> {
    return request('/designs');
  },

  async designGet(id: string, size = 512, mode: 'bordado' | 'puntos' = 'puntos'): Promise<{ ok: boolean; design: SavedDesign } & DesignPreview> {
    return request(`/design/${encodeURIComponent(id)}?size=${size}&mode=${mode}`);
  },

  async designDelete(id: string): Promise<{ ok: boolean }> {
    return request(`/design/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async designDownload(id: string, filename: string): Promise<void> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await httpFetch(`${API_BASE}/design/${encodeURIComponent(id)}/download`, { headers });
    if (!res.ok) throw new ApiError(res.status, `Error ${res.status} al descargar`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'diseno';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export { getToken, setToken, getProfile, setProfile };