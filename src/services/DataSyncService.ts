/**
 * DataSyncService — Sincronización bidireccional real (pull + push) de los
 * datos de cada módulo con el backend (SQLite en el servidor).
 *
 * Estrategia: cada módulo se respalda como un snapshot completo bajo la clave
 * `data:<module>` en el store del servidor. El servidor guarda el timestamp
 * de cada entrada; localmente llevamos una marca `sync_meta:<module>` con
 * { usuario, ts } para saber cuán reciente es lo local.
 *
 * Regla de fusión (last-write-wins por módulo):
 *  - Si lo remoto es más nuevo  → adoptamos (baja al equipo actual).
 *  - Si lo local es más nuevo (o lo remoto no existe) → subimos lo local.
 *  - Cada edición local marca el módulo como "sucio" y agenda un push.
 *
 * Resultado: al entrar desde cualquier equipo se descarga el estado real y,
 * si hubo ediciones locales (ej. offline), estas también se suben.
 */

import { Api, getProfile, getToken } from './ApiClient';
import { API_BASE } from './config';

export interface SyncSlot {
  slot: string;
  lsKey: string;
}

export interface SyncModuleDef {
  module: string;
  serverKey: string;
  keys: SyncSlot[];
}

interface SyncModule extends SyncModuleDef {
  read(): Record<string, unknown>;
  apply(payload: Record<string, unknown>): void;
  hasData(): boolean;
}

interface RemoteRow {
  key: string;
  data: unknown;
  updatedAt: number | null;
}

const META_PREFIX = 'sync_meta:';
const RESTORE_EVENT_PREFIX = 'quincha-restore:';

const MODULE_DEFS: SyncModuleDef[] = [
  {
    module: 'tasks',
    serverKey: 'data:tasks',
    keys: [
      { slot: 'tasks', lsKey: 'quincha_tasks_v2' },
      { slot: 'projects', lsKey: 'quincha_projects_v2' },
    ],
  },
  {
    module: 'habits',
    serverKey: 'data:habits',
    keys: [{ slot: 'habits', lsKey: 'quincha_habits_v2' }],
  },
  {
    module: 'finance',
    serverKey: 'data:finance',
    keys: [
      { slot: 'movimientos', lsKey: 'quincha_finance_movimientos_v2' },
      { slot: 'deudas', lsKey: 'quincha_finance_deudas_v2' },
    ],
  },
  {
    module: 'budgets',
    serverKey: 'data:budgets',
    keys: [{ slot: 'budgets', lsKey: 'quincha_finance_budgets' }],
  },
  {
    module: 'bujo',
    serverKey: 'data:bujo',
    keys: [
      { slot: 'entries', lsKey: 'quincha_bujo_entries_v2' },
      { slot: 'moods', lsKey: 'quincha_bujo_moods_v2' },
      { slot: 'checkins', lsKey: 'quincha_bujo_checkins_v2' },
    ],
  },
  {
    module: 'clients',
    serverKey: 'data:clients',
    keys: [{ slot: 'clients', lsKey: 'quincha_clients_v2' }],
  },
  {
    module: 'goals',
    serverKey: 'data:goals',
    keys: [{ slot: 'goals', lsKey: 'quincha_goals_v2' }],
  },
  {
    module: 'health',
    serverKey: 'data:health',
    keys: [{ slot: 'data', lsKey: 'quincha_health_data_v2' }],
  },
  {
    module: 'messages',
    serverKey: 'data:messages',
    keys: [
      { slot: 'messages', lsKey: 'quincha_messages_v2' },
      { slot: 'readIds', lsKey: 'quincha_read_notifications_v2' },
    ],
  },
  {
    module: 'pomodoro',
    serverKey: 'data:pomodoro',
    keys: [{ slot: 'logs', lsKey: 'quincha_pomodoro_logs_v2' }],
  },
  {
    module: 'shopping',
    serverKey: 'data:shopping',
    keys: [{ slot: 'products', lsKey: 'quincha_shopping_products_v2' }],
  },
  {
    module: 'band',
    serverKey: 'data:band',
    keys: [
      { slot: 'days', lsKey: 'quincha_band_miband5_v2' },
      { slot: 'alarms', lsKey: 'quincha_band_alarms_v3' },
      { slot: 'settings', lsKey: 'quincha_band_settings_v3' },
      { slot: 'source', lsKey: 'quincha_band_source_v2' },
    ],
  },
];

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* cuota llena o modo privado: se ignora */
  }
}

// Considera "vacío" a arrays/objetos/strings sin contenido y a null/undefined.
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  if (typeof value === 'string') return value.length === 0;
  return false;
}

function buildModule(def: SyncModuleDef): SyncModule {
  return {
    ...def,
    read(): Record<string, unknown> {
      const out: Record<string, unknown> = {};
      for (const k of def.keys) out[k.slot] = readJSON(k.lsKey);
      return out;
    },
    apply(payload: Record<string, unknown>): void {
      for (const k of def.keys) {
        if (payload[k.slot] !== undefined) writeJSON(k.lsKey, payload[k.slot]);
      }
      window.dispatchEvent(new CustomEvent(RESTORE_EVENT_PREFIX + def.module, { detail: { data: payload } }));
    },
    hasData(): boolean {
      for (const k of def.keys) {
        const value = readJSON(k.lsKey);
        if (!isEmptyValue(value)) return true;
      }
      return false;
    },
  };
}

class DataSync {
  private modules = new Map<string, SyncModule>();
  private dirty = new Set<string>();
  private applying = new Set<string>();
  private flushTimer: number | null = null;
  private retryTimer: number | null = null;
  private reconciling = false;
  private flushing = false;
  private started = false;

  register(defs: SyncModuleDef[]): void {
    for (const def of defs) {
      this.modules.set(def.module, buildModule(def));
    }
  }

  /** Marca un módulo como modificado y agenda el push. */
  markDirty(module: string): void {
    const def = this.modules.get(module);
    if (!def) return;
    if (this.applying.has(module)) return;
    // Nada que respaldar y sin historial previo → no tocar la marca de tiempo
    // (evita que un equipo nuevo pise datos del servidor con vacíos locales).
    if (def.hasData() || this.readMeta(module) > 0) {
      const now = Date.now();
      const prev = this.readMeta(module);
      if (now > prev) this.writeMeta(module, now);
      this.dirty.add(module);
      this.scheduleFlush();
    }
  }

  /** Sincroniza con el servidor: baja lo remoto más nuevo y sube lo local. */
  async reconcile(): Promise<void> {
    if (this.reconciling) return;
    if (!this.canSync()) return;
    this.reconciling = true;
    try {
      const rows = (await Api.fetchSync()) as RemoteRow[];
      const byKey = new Map(rows.map((r) => [r.key, r]));

      for (const [module, def] of this.modules) {
        const remote = byKey.get(def.serverKey);
        const remoteTs = extractTs(remote);
        const localTs = this.readMeta(module);

        if (remote && remoteTs > localTs) {
          // Lo remoto es más nuevo → adoptar en este equipo.
          const payload = extractPayload(remote);
          if (!payload) continue;
          this.applying.add(module);
          try {
            def.apply(payload);
            this.writeMeta(module, remoteTs);
          } finally {
            window.setTimeout(() => this.applying.delete(module), 250);
          }
        } else if (!remote || localTs > remoteTs) {
          // Lo local es más nuevo o el servidor no tiene respaldo → subir.
          if (this.shouldPush(def)) this.dirty.add(module);
        }
      }
    } catch {
      /* Si el pull falla, seguimos con la cola local de push. */
    } finally {
      this.reconciling = false;
      void this.flush();
    }
  }

  /** Envía los módulos pendientes (debounced) al servidor. */
  async flush(): Promise<void> {
    if (this.reconciling || this.flushing) return;
    if (this.dirty.size === 0) return;
    if (!this.canSync()) {
      this.scheduleRetry();
      return;
    }

    this.flushing = true;
    try {
      const items: { module: string; entry: { key: string; data: unknown; updatedAt: number } }[] = [];
      for (const module of Array.from(this.dirty)) {
        const def = this.modules.get(module);
        if (!def) {
          this.dirty.delete(module);
          continue;
        }
        if (!this.shouldPush(def)) {
          this.dirty.delete(module);
          continue;
        }
        const ts = this.readMeta(module) || Date.now();
        items.push({
          module,
          entry: { key: def.serverKey, data: { updatedAt: ts, data: def.read() }, updatedAt: ts },
        });
      }
      if (items.length === 0) return;

      await Api.sync(items.map((i) => i.entry));
      for (const item of items) this.dirty.delete(item.module);
    } catch {
      this.scheduleRetry();
    } finally {
      this.flushing = false;
    }
  }

  /** ¿Hay sesión activa para sincronizar? */
  canSync(): boolean {
    return Api.isAuthenticated();
  }

  installLifecycle(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('online', () => void this.flush());
    window.addEventListener('beforeunload', () => this.pushSyncKeepAlive());
  }

  private shouldPush(def: SyncModule): boolean {
    return def.hasData() || this.readMeta(def.module) > 0;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 800);
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== null) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, 15000);
  }

  private metaKey(module: string): string {
    return `${META_PREFIX}${module}`;
  }

  private readMeta(module: string): number {
    try {
      const raw = localStorage.getItem(this.metaKey(module));
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { u?: string; ts?: number };
      if (parsed && parsed.u === this.username() && typeof parsed.ts === 'number') {
        return parsed.ts;
      }
    } catch {
      /* marca corrupta: se trata como 0 */
    }
    return 0;
  }

  private writeMeta(module: string, ts: number): void {
    writeJSON(this.metaKey(module), { u: this.username(), ts });
  }

  private username(): string {
    return getProfile()?.username || '';
  }

  private pushSyncKeepAlive(): void {
    if (this.dirty.size === 0 || !this.canSync()) return;
    const items: { key: string; data: unknown; updatedAt: number }[] = [];
    for (const module of Array.from(this.dirty)) {
      const def = this.modules.get(module);
      if (!def || !this.shouldPush(def)) continue;
      const ts = this.readMeta(module) || Date.now();
      items.push({ key: def.serverKey, data: { updatedAt: ts, data: def.read() }, updatedAt: ts });
    }
    if (items.length === 0) return;
    fetch(`${API_BASE}/sync`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ entries: items }),
    }).catch(() => {});
  }
}

function extractTs(remote: RemoteRow | undefined): number {
  if (!remote) return 0;
  const envelope = remote.data as { updatedAt?: unknown } | null;
  if (envelope && typeof envelope.updatedAt === 'number') return envelope.updatedAt;
  const serverTs = Number(remote.updatedAt);
  return Number.isFinite(serverTs) && serverTs > 0 ? serverTs : 0;
}

function extractPayload(remote: RemoteRow): Record<string, unknown> | null {
  const envelope = remote.data as { data?: unknown } | null;
  if (!envelope || typeof envelope !== 'object') return null;
  const payload = envelope.data;
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

export const DataSyncService = new DataSync();
DataSyncService.register(MODULE_DEFS);
DataSyncService.installLifecycle();
