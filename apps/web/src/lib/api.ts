import { enqueueOfflineAction, flushOfflineQueue } from './offline-sync';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const token = localStorage.getItem('solar_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // If network is offline and user is making a mutating request, queue it
  if (!navigator.onLine && ['POST', 'PATCH', 'PUT'].includes(method)) {
    await enqueueOfflineAction({
      endpoint,
      method,
      body: options.body,
    });
    return {
      _offlineQueued: true,
      message: 'Saved offline. Changes will sync automatically when network returns.',
    } as any;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorJson = await res.json();
      errorMsg = errorJson.message || errorJson.error || errorMsg;
    } catch {
      errorMsg = res.statusText;
    }
    throw new Error(errorMsg);
  }

  // Handle empty or attachment response
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res as any;
}

/**
 * Download a protected file endpoint (exports, sample sheets) with the bearer
 * token attached. `window.open` cannot send an Authorization header, which is why
 * those links previously returned 401.
 */
export async function downloadFile(
  endpoint: string,
  filename?: string,
): Promise<void> {
  const token = localStorage.getItem('solar_auth_token');
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let errorMsg = 'Download failed';
    try {
      const errorJson = await res.json();
      errorMsg = errorJson.message || errorJson.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const name = filename || (match ? match[1] : 'download');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Auto sync when reconnecting
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    try {
      const count = await flushOfflineQueue((ep, meth, b) =>
        apiRequest(ep, { method: meth, body: b }),
      );
      if (count > 0) {
        console.log(`[Offline Sync] Replayed ${count} queued mutations.`);
      }
    } catch (err) {
      console.warn('[Offline Sync] Sync failed:', err);
    }
  });
}
