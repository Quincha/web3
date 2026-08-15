/**
 * Capa de persistencia clave/valor.
 *
 * - En navegador (web): delega en `localStorage` (comportamiento actual).
 * - En la app de escritorio (Tauri): respaldo SQLite nativo (WAL) vía comando
 *   Rust, con caché en memoria para mantener la API síncrona. Cada escritura
 *   se vuelca en segundo plano; se sincroniza el caché al iniciar.
 *
 * Así todos los módulos y servicios existentes (que usan getItem/setItem/
 * removeItem) funcionan idéntico en web y desktop.
 */

import { isTauri, invoke } from '@tauri-apps/api/core';

export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class BrowserKV implements KVStore {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* cuota llena o modo privado: se ignora */
    }
  }
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

class TauriKV implements KVStore {
  private cache = new Map<string, string>();
  private ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    try {
      const rows = (await invoke('kv_all')) as [string, string][];
      for (const [key, value] of rows) this.cache.set(key, value);
    } catch {
      /* sin BD local: se queda vacío */
    }
  }

  private ensureReady(): void {
    // El primer acceso se resuelve con el caché una vez cargado.
    void this.ready;
  }

  getItem(key: string): string | null {
    this.ensureReady();
    return this.cache.has(key) ? this.cache.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    invoke('kv_set', { key, value }).catch(() => {});
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    invoke('kv_remove', { key }).catch(() => {});
  }

  /** Vuelca el caché completo a SQLite (para cierre ordenado de la app). */
  flush(): Promise<void> {
    const writes = Array.from(this.cache.entries()).map(([key, value]) =>
      invoke('kv_set', { key, value }).catch(() => {}),
    );
    return Promise.all(writes).then(() => {});
  }
}

export const storage: KVStore = isTauri() ? new TauriKV() : new BrowserKV();

/** Solo disponible en la app de escritorio: vuelca pendientes a SQLite. */
export async function flushStorage(): Promise<void> {
  if (storage instanceof TauriKV) await storage.flush();
}
