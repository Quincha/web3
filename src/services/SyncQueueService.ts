/**
 * SyncQueueService — Offline-First Event Queue
 *
 * Singleton service that intercepts all user actions and queues them
 * as events to be synced with the backend when connectivity is available.
 *
 * Architecture:
 *   User Action → Context updates local state + localStorage cache
 *                       ↓
 *               SyncQueueService.enqueue(event)
 *                       ↓
 *   [online?] YES → flush() → POST /api/sync → marked synced
 *             NO  → stays queued → 'online' listener → auto-retry
 */

import { getToken } from './ApiClient';
import { API_BASE } from './config';
import { storage } from './storage';
import { httpFetch } from './http';

export type SyncEventType =  | 'CREATE_TASK'        | 'UPDATE_TASK'      | 'COMPLETE_TASK'    | 'DELETE_TASK'
  | 'CREATE_HABIT'       | 'TOGGLE_HABIT'     | 'ARCHIVE_HABIT'
  | 'COMPLETE_POMODORO'
  | 'ADD_BUJO_ENTRY'     | 'UPDATE_BUJO_ENTRY'| 'DELETE_BUJO_ENTRY'
  | 'MARK_DOSE'          | 'ADD_APPOINTMENT'  | 'UPDATE_APPOINTMENT'
  | 'CREATE_PROJECT'     | 'UPDATE_PROJECT'   | 'CREATE_CLIENT'
  | 'UPDATE_CLIENT'      | 'SET_HABIT_STATE'
  | 'CREATE_MOVIMIENTO'  | 'UPDATE_MOVIMIENTO'| 'DELETE_MOVIMIENTO'
  | 'CREATE_DEUDA'       | 'UPDATE_DEUDA'     | 'DELETE_DEUDA';

export interface SyncEvent {
  id: string;
  type: SyncEventType;
  payload: Record<string, unknown>;
  timestamp: string;        // when generated (client-side)
  synced: boolean;          // false = pending
  syncedAt: string | null;  // when successfully synced
  retries: number;          // failed attempts count
  error: string | null;     // last error message
}

const QUEUE_KEY = 'quincha_sync_queue_v2';
const MAX_RETRIES = 3;
const FLUSH_DEBOUNCE_MS = 1500;  // batch events within 1.5s window

// ── Subscribers for reactive UI updates ──────────────────────────
type SyncStatusListener = (status: SyncStatus) => void;

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

// ─────────────────────────────────────────────────────────────────

function genId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

class SyncQueue {
  private queue: SyncEvent[] = [];
  private listeners: SyncStatusListener[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;

  constructor() {
    this.queue = this.loadQueue();

    // React to online/offline browser events
    window.addEventListener('online',  () => this.handleOnlineChange(true));
    window.addEventListener('offline', () => this.handleOnlineChange(false));

    // Initial flush if online and queue has pending events
    if (navigator.onLine && this.pendingCount() > 0) {
      this.scheduleFlush();
    }
  }

  // ── Public API ──────────────────────────────────────────────────

  enqueue(type: SyncEventType, payload: Record<string, unknown>): void {
    const event: SyncEvent = {
      id: genId(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      synced: false,
      syncedAt: null,
      retries: 0,
      error: null,
    };

    this.queue.push(event);
    this.saveQueue();
    this.notifyListeners();

    if (navigator.onLine) {
      this.scheduleFlush();
    }
  }

  getStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      pendingCount: this.pendingCount(),
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.push(listener);
    // Immediately emit current state
    listener(this.getStatus());
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getQueue(): SyncEvent[] {
    return [...this.queue];
  }

  /** Dispara un flush inmediato de la cola si hay pendientes y hay conexión. */
  syncNow(): void {
    if (navigator.onLine && this.pendingCount() > 0) {
      void this.flush();
    }
  }

  clearSynced(): void {
    this.queue = this.queue.filter(e => !e.synced);
    this.saveQueue();
    this.notifyListeners();
  }

  // ── Private Methods ─────────────────────────────────────────────

  private pendingCount(): number {
    return this.queue.filter(e => !e.synced).length;
  }

  private handleOnlineChange(isOnline: boolean): void {
    this.notifyListeners();
    if (isOnline && this.pendingCount() > 0) {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), FLUSH_DEBOUNCE_MS);
  }

  private async flush(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;

    const pending = this.queue.filter(e => !e.synced && e.retries < MAX_RETRIES);
    if (pending.length === 0) return;

    this.isSyncing = true;
    this.notifyListeners();

    for (const event of pending) {
      try {
        await this.simulateBackendSync(event);
        event.synced = true;
        event.syncedAt = new Date().toISOString();
        event.error = null;
        this.lastSyncedAt = event.syncedAt;
        this.lastError = null;
      } catch (err) {
        event.retries += 1;
        event.error = err instanceof Error ? err.message : 'Unknown error';
        this.lastError = event.error;
      }
    }

    this.saveQueue();
    this.isSyncing = false;
    this.notifyListeners();

    // Auto-cleanup synced events older than 24h
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    this.queue = this.queue.filter(e =>
      !e.synced || new Date(e.syncedAt!).getTime() > cutoff.getTime()
    );
    this.saveQueue();
  }

  /**
   * Real backend sync via the Quincha API.
   * Events are pushed as one payload per event type using the generic /api/sync store.
   */
  private async simulateBackendSync(event: SyncEvent): Promise<void> {
    if (!getToken()) {
      // Not logged in: nothing to sync to the server; treat as best-effort success
      // so the queue doesn't accumulate noise for anonymous local usage.
      return;
    }
    const res = await httpFetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        entries: [{ key: `sync_event:${event.id}`, data: event, updatedAt: Date.now() }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Sync falló con status ${res.status}`);
    }
  }

  private loadQueue(): SyncEvent[] {
    try {
      const raw = storage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(): void {
    storage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(l => l(status));
  }
}

// ── Singleton export ─────────────────────────────────────────────
export const SyncQueueService = new SyncQueue();
