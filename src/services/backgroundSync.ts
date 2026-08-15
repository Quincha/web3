/**
 * BackgroundSync — sincronización automática en segundo plano.
 *
 * - En la app de escritorio (Tauri) corre un health-check periódico contra el
 *   servidor y, cuando hay conexión, reconcilia (pull + push) los datos
 *   pendientes. Así la app sincroniza aunque se haya abierto sin internet.
 * - En web se mantiene el comportamiento actual (eventos online/offline).
 */

import { Api } from './ApiClient';
import { DataSyncService } from './DataSyncService';
import { SyncQueueService } from './SyncQueueService';
import { flushStorage } from './storage';
import { isTauriRuntime } from './http';

const HEALTH_INTERVAL_MS = 30 * 1000;
const SYNC_INTERVAL_MS = 60 * 1000;

let healthTimer: number | null = null;
let syncTimer: number | null = null;

async function syncPending(): Promise<void> {
  await DataSyncService.reconcile().catch(() => {});
  if (SyncQueueService.getStatus().pendingCount > 0) {
    SyncQueueService.syncNow();
  }
}

async function pollHealth(): Promise<void> {
  let isOnline = false;
  try {
    const h = await Api.health();
    isOnline = h.ok;
  } catch {
    isOnline = false;
  }
  if (isOnline) {
    await syncPending();
  }
}

/** Arranca los temporizadores de segundo plano (idempotente). */
export function startBackgroundSync(): void {
  if (healthTimer !== null || syncTimer !== null) return;

  // Sincronización inicial al abrir la app.
  void syncPending();

  if (isTauriRuntime()) {
    healthTimer = window.setInterval(() => void pollHealth(), HEALTH_INTERVAL_MS);
    syncTimer = window.setInterval(() => void syncPending(), SYNC_INTERVAL_MS);
  }

  // En ambos entornos: volcar pendientes al cerrar.
  window.addEventListener('beforeunload', () => {
    void flushStorage();
  });
}
