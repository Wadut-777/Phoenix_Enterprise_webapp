import { ApiError } from './api';

const csrf = () => {
  const m = document.cookie.match(/(?:^|; )pe_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

let refreshing: Promise<boolean> | null = null;
const doRefresh = async () => {
  try {
    const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf() } });
    return r.ok;
  } catch {
    return false;
  }
};

/** fetch() against the admin/auth API: sends the CSRF header and transparently renews an expired session once. */
export async function adminFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers: Record<string, string> = { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...((init.headers as Record<string, string>) || {}) };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf();
  const res = await fetch('/api' + path, { ...init, headers, credentials: 'same-origin' });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    refreshing ??= doRefresh().finally(() => { refreshing = null; });
    if (await refreshing) return adminFetch(path, init, false);
  }
  return res;
}

export async function adminApi<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch { /* not JSON */ }
    throw new ApiError(body.error || 'Request failed.', res.status, body.fields);
  }
  return res.json();
}

export const post = <T = any>(path: string, body?: unknown) => adminApi<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const put = <T = any>(path: string, body?: unknown) => adminApi<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const patch = <T = any>(path: string, body?: unknown) => adminApi<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
export const del = <T = any>(path: string) => adminApi<T>(path, { method: 'DELETE' });

/** Downloads an authenticated file (CSV export, resumes). */
export async function download(path: string, fallbackName: string) {
  const res = await adminFetch(path);
  if (!res.ok) throw new ApiError('Download failed.', res.status);
  const cd = res.headers.get('content-disposition') || '';
  const name = /filename="?([^";]+)"?/.exec(cd)?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
