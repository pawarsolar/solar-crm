/**
 * Kyros Solar CRM — Offline Photo Upload Queue for Field Surveys
 * Stores compressed canvas photos in IndexedDB with BackgroundSync API
 * for seamless offline rooftop and meter photo capture during remote site surveys.
 */

import { compressImageFile } from './image-compressor';

export type SurveyPhotoType =
  | 'rooftop'
  | 'shadow'
  | 'meter'
  | 'earthing'
  | 'distribution_board'
  | 'site_overall';

export interface QueuedSurveyPhoto {
  id: string;
  leadId: string;
  surveyId?: string;
  photoType: SurveyPhotoType;
  caption?: string;
  blob: Blob;
  dataUrl?: string; // Cacheable data URL for instant offline UI rendering
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  status: 'queued' | 'uploading' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
}

const DB_NAME = 'KyrosSolarEPC_OfflineDB';
const DB_VERSION = 2; // Incremented for photos store
const STORE_NAME = 'survey_photos_queue';
const PHOTO_QUEUE_EVENT = 'kyros-photo-queue-changed';

function openPhotoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('leads_queue')) {
        const leadStore = db.createObjectStore('leads_queue', { keyPath: 'id' });
        leadStore.createIndex('status', 'status', { unique: false });
        leadStore.createIndex('queuedAt', 'queuedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const photoStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        photoStore.createIndex('leadId', 'leadId', { unique: false });
        photoStore.createIndex('status', 'status', { unique: false });
        photoStore.createIndex('capturedAt', 'capturedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function notifyPhotoQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PHOTO_QUEUE_EVENT));
  }
}

/**
 * Register background sync tag if supported by browser Service Worker
 */
async function registerBackgroundSync() {
  if (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window
  ) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-ignore - BackgroundSync SyncManager
      if (reg && reg.sync) {
        // @ts-ignore
        await reg.sync.register('sync-survey-photos');
      }
    } catch {
      // Background Sync unsupported or blocked by permissions; online event listener handles fallback
    }
  }
}

/**
 * Compress image using Canvas and enqueue into IndexedDB
 */
export async function enqueueSurveyPhoto(params: {
  leadId: string;
  surveyId?: string;
  file: File;
  photoType: SurveyPhotoType;
  caption?: string;
}): Promise<QueuedSurveyPhoto> {
  const { leadId, surveyId, file, photoType, caption } = params;

  // 1. High-efficiency client canvas compression (<500KB JPEG/WebP)
  const compressedFile = await compressImageFile(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    mimeType: 'image/jpeg',
    maxSizeBytes: 500 * 1024,
  });

  // 2. Generate local data URL for immediate offline UI preview
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(compressedFile);
  });

  const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item: QueuedSurveyPhoto = {
    id: photoId,
    leadId,
    surveyId,
    photoType,
    caption: caption || `${photoType.replace('_', ' ')} photo`,
    blob: compressedFile,
    dataUrl,
    fileName: compressedFile.name,
    mimeType: compressedFile.type,
    sizeBytes: compressedFile.size,
    capturedAt: new Date().toISOString(),
    status: 'queued',
    retryCount: 0,
  };

  const db = await openPhotoDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  notifyPhotoQueueChanged();
  await registerBackgroundSync();
  return item;
}

/**
 * Get all queued photos, optionally filtered by leadId
 */
export async function getQueuedPhotos(leadId?: string): Promise<QueuedSurveyPhoto[]> {
  try {
    const db = await openPhotoDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        let items: QueuedSurveyPhoto[] = req.result || [];
        if (leadId) {
          items = items.filter((p) => p.leadId === leadId);
        }
        items.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Returns number of photos pending upload
 */
export async function getPendingPhotoCount(leadId?: string): Promise<number> {
  const photos = await getQueuedPhotos(leadId);
  return photos.filter((p) => p.status !== 'synced').length;
}

/**
 * Remove a photo from queue after successful upload
 */
export async function removeQueuedPhoto(id: string): Promise<void> {
  const db = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      notifyPhotoQueueChanged();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Update photo item status
 */
export async function updateQueuedPhoto(item: QueuedSurveyPhoto): Promise<void> {
  const db = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => {
      notifyPhotoQueueChanged();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Synchronize all queued photos to the server API
 */
export async function syncQueuedPhotos(
  uploadFn: (photo: QueuedSurveyPhoto) => Promise<any>,
): Promise<{ synced: number; failed: number }> {
  const allPhotos = await getQueuedPhotos();
  const pending = allPhotos.filter((p) => p.status === 'queued' || p.status === 'failed');

  let synced = 0;
  let failed = 0;

  for (const photo of pending) {
    try {
      photo.status = 'uploading';
      await updateQueuedPhoto(photo);

      await uploadFn(photo);
      await removeQueuedPhoto(photo.id);
      synced++;
    } catch (err: any) {
      failed++;
      photo.status = 'failed';
      photo.retryCount = (photo.retryCount || 0) + 1;
      photo.error = err.message || 'Network upload failure';
      await updateQueuedPhoto(photo);
    }
  }

  notifyPhotoQueueChanged();
  return { synced, failed };
}

/**
 * Subscribe to photo queue mutations
 */
export function subscribeToPhotoQueue(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PHOTO_QUEUE_EVENT, callback);
  return () => window.removeEventListener(PHOTO_QUEUE_EVENT, callback);
}

// Auto-sync listener when browser reconnects to internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyPhotoQueueChanged();
  });
}
