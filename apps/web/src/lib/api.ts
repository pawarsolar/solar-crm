import { enqueueOfflineAction, flushOfflineQueue } from './offline-sync';

function safeParseJson(text: string): any {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  // If running in browser:
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]';

    // 1. When running on Render web service/static site (e.g. solar-crm-web.onrender.com):
    if (hostname.includes('onrender.com')) {
      if (envUrl && !envUrl.includes('localhost') && envUrl.startsWith('http')) {
        return envUrl;
      }
      return 'https://solar-crm-06uk.onrender.com/api';
    }

    // 2. When running on Netlify or custom production domain:
    // Always use '/api' to leverage Netlify edge proxy (zero CORS, zero hardcoded backend IP)
    // unless an explicit non-localhost HTTPS URL is configured.
    if (!isLocalhost) {
      if (envUrl && envUrl.startsWith('https://') && !envUrl.includes('localhost')) {
        return envUrl;
      }
      return '/api';
    }

    // 3. When running on localhost:
    // If VITE_API_URL explicitly specifies an HTTPS live backend, use it
    if (envUrl && envUrl.startsWith('https://')) {
      return envUrl;
    }

    // By default on localhost, use '/api' which Vite's dev server proxies to Render backend
    // (or local backend if VITE_BACKEND_URL is set in environment). This prevents
    // ERR_CONNECTION_REFUSED if the local NestJS server is not running!
    return '/api';
  }

  // Build-time / test fallback
  if (envUrl && envUrl.startsWith('https://')) {
    return envUrl;
  }
  return '/api';
}

export const API_BASE = getApiBaseUrl();

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

  const rawText = await res.text();
  const parsed = safeParseJson(rawText);

  if (!res.ok) {
    if (parsed && (parsed.message || parsed.error)) {
      throw new Error(parsed.message || parsed.error);
    }
    if (rawText.trim().startsWith('<')) {
      throw new Error(
        `Endpoint ${endpoint} returned HTML (Status ${res.status}). Ensure the backend API is running and reachable.`,
      );
    }
    throw new Error(res.statusText || `Request failed with HTTP status ${res.status}`);
  }

  if (parsed !== null) {
    return parsed;
  }

  return rawText as any;
}

/**
 * Robust file upload helper using FormData, attaching Bearer auth and safely
 * handling non-JSON or HTML gateway errors without throwing Unexpected end of JSON input.
 */
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData,
  options: {
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const token = localStorage.getItem('solar_auth_token');
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (err: any) {
    throw new Error(
      `Unable to reach backend API at ${API_BASE}. Please ensure the server is running or check internet connectivity.`,
    );
  }

  const rawText = await res.text();
  const parsed = safeParseJson(rawText);

  if (!res.ok) {
    if (parsed && (parsed.message || parsed.error)) {
      throw new Error(parsed.message || parsed.error);
    }
    if (rawText.trim().startsWith('<')) {
      throw new Error(
        `Upload endpoint ${endpoint} returned HTML (Status ${res.status}). Backend server may be restarting.`,
      );
    }
    throw new Error(res.statusText || `Upload failed with HTTP status ${res.status}`);
  }

  if (parsed !== null) {
    return parsed;
  }

  return rawText as any;
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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err: any) {
    throw new Error(`Unable to connect to download service at ${API_BASE}`);
  }

  if (!res.ok) {
    let errorMsg = `Download failed with HTTP status ${res.status}`;
    try {
      const text = await res.text();
      const parsed = safeParseJson(text);
      if (parsed && (parsed.message || parsed.error)) {
        errorMsg = parsed.message || parsed.error;
      } else if (res.statusText) {
        errorMsg = res.statusText;
      }
    } catch {
      // Keep default error message
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
