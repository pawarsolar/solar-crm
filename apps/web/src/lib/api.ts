import { enqueueOfflineAction, flushOfflineQueue } from './offline-sync';

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  // If running in browser and NOT on localhost/127.0.0.1:
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';

    // When running on a deployed website (e.g. kyroscrm.netlify.app, custom domain):
    if (!isLocalhost) {
      // If VITE_API_URL is missing or points to localhost, fall back to '/api' (Netlify CDN proxy)
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return '/api';
      }
      return envUrl;
    }
  }

  return envUrl || 'https://solar-crm-06uk.onrender.com/api';
}

const API_BASE = getApiBaseUrl();

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err: any) {
    if (err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const hint = isLocalhost
        ? 'Please ensure the NestJS backend is running locally (npm run dev:api).'
        : 'Please ensure the Render backend is operational or check network connection.';
      throw new Error(`Unable to reach backend API at ${API_BASE}. ${hint}`);
    }
    throw err;
  }

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

  // Guard against Netlify SPA fallback returning index.html for API routes
  if (contentType && contentType.includes('text/html')) {
    throw new Error(
      `Endpoint ${endpoint} returned HTML instead of JSON. Ensure the backend API is deployed on Render and VITE_API_URL is configured.`,
    );
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
