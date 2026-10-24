/**
 * Offline Sync Queue for Field Operations
 * Uses browser IndexedDB to persist leads captured in low-connectivity/offline environments.
 * Automatically synchronizes with Kyros Solar CRM API when network connectivity is restored.
 */

export interface OfflineLeadPayload {
  name: string;
  phone: string;
  city: string;
  source?: string;
  monthly_bill?: number;
  system_kw?: number;
  notes?: string;
  email?: string;
  state?: string;
  category?: string;
}

export interface OfflineLeadItem {
  id: string;
  payload: OfflineLeadPayload;
  queuedAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retryCount: number;
}

const DB_NAME = 'KyrosSolarEPC_OfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'leads_queue';
const QUEUE_EVENT = 'kyros-offline-queue-changed';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  }
}

/**
 * Enqueues a new lead into the offline IndexedDB store.
 */
export async function enqueueOfflineLead(payload: OfflineLeadPayload): Promise<OfflineLeadItem> {
  const db = await openDatabase();
  const item: OfflineLeadItem = {
    id: `offline-lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    payload,
    queuedAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(item);

    request.onsuccess = () => {
      notifyQueueChanged();
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all queued offline leads.
 */
export async function getOfflineQueue(): Promise<OfflineLeadItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: OfflineLeadItem[] = request.result || [];
        // Sort newest first
        items.sort((a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime());
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Returns the count of pending leads waiting in the offline queue.
 */
export async function getPendingOfflineCount(): Promise<number> {
  try {
    const items = await getOfflineQueue();
    return items.filter((i) => i.status !== 'syncing').length;
  } catch {
    return 0;
  }
}

/**
 * Removes a lead from the offline queue upon successful synchronization.
 */
export async function removeOfflineLead(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      notifyQueueChanged();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Updates an offline lead entry status (e.g. syncing, failed).
 */
export async function updateOfflineLead(item: OfflineLeadItem): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => {
      notifyQueueChanged();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Subscribes to offline queue state changes.
 */
export function subscribeToOfflineQueue(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(QUEUE_EVENT, callback);
  return () => window.removeEventListener(QUEUE_EVENT, callback);
}

/**
 * Processes and synchronizes all pending offline leads with the server API.
 */
export async function syncOfflineQueue(
  apiCaller: (body: any) => Promise<any>,
): Promise<{ synced: number; failed: number }> {
  const queue = await getOfflineQueue();
  const pending = queue.filter((item) => item.status !== 'syncing');

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      item.status = 'syncing';
      await updateOfflineLead(item);

      await apiCaller(item.payload);
      await removeOfflineLead(item.id);
      synced++;
    } catch (err: any) {
      failed++;
      item.status = 'failed';
      item.retryCount = (item.retryCount || 0) + 1;
      item.error = err?.message || 'Network sync error';
      await updateOfflineLead(item);
    }
  }

  notifyQueueChanged();
  return { synced, failed };
}
