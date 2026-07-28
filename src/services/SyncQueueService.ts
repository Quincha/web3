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
 *   [online?] YES → flush() → simulated POST → mark synced
 *             NO  → stays queued → 'online' listener → auto-retry
 */

export type SyncEventType =
  | 'CREATE_TASK'        | 'UPDATE_TASK'      | 'COMPLETE_TASK'    | 'DELETE_TASK'
  | 'CREATE_HABIT'       | 'TOGGLE_HABIT'     | 'ARCHIVE_HABIT'
  | 'COMPLETE_POMODORO'
  | 'ADD_BUJO_ENTRY'     | 'UPDATE_BUJO_ENTRY'| 'DELETE_BUJO_ENTRY'
  | 'MARK_DOSE'          | 'ADD_APPOINTMENT'  | 'UPDATE_APPOINTMENT'
  | 'CREATE_PROJECT'     | 'UPDATE_PROJECT';

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

const QUEUE_KEY = 'quincha_sync_queue';
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
   * Simulated backend sync.
   * Replace this with a real fetch() call in production:
   *   await fetch('/api/sync', { method: 'POST', body: JSON.stringify(event) })
   */
  private simulateBackendSync(event: SyncEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      const delay = 300 + Math.random() * 400; // 300-700ms simulated latency
      const shouldFail = Math.random() < 0.02;  // 2% simulated failure rate

      setTimeout(() => {
        if (shouldFail) {
          reject(new Error('Simulated network error'));
        } else {
          // In production: validate response status here
          resolve();
        }
      }, delay);
    });
  }

  private loadQueue(): SyncEvent[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(l => l(status));
  }
}

// ── Singleton export ─────────────────────────────────────────────
export const SyncQueueService = new SyncQueue();
