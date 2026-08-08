import { API_BASE } from './config';

const TOKEN_KEY = 'q_token';
const PROFILE_KEY = 'q_profile';

export interface AuthUser {
  username: string;
  role: string;
  name: string;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setProfile(profile: AuthUser | null) {
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  else localStorage.removeItem(PROFILE_KEY);
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
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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
};

export { getToken, setToken, getProfile, setProfile };