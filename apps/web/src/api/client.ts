import { tokenStore } from '../auth/tokenStore';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  tokenStore.set(data.accessToken);
  return data.accessToken as string;
}

async function doFetch(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
    credentials: 'include',
  });
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await doFetch(path, options, tokenStore.get());

  const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
  if (res.status === 401 && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(path, options, newToken);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message.join(', ') : (data.message ?? message);
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) return (await res.json()) as T;
  return undefined as T;
}

/** Downloads through the same auth/refresh flow as apiFetch, then saves via a blob URL. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  let res = await doFetch(path, {}, tokenStore.get());
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(path, {}, newToken);
  }
  if (!res.ok) throw new ApiError(res.status, 'Download failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
