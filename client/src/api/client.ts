import type { Session } from './types';

// ---------------------------------------------------------------------
// Config — point these at wherever the three APIs are actually running.
// ---------------------------------------------------------------------
export const AUTH_API = import.meta.env.VITE_AUTH_API ?? 'http://localhost:3002';
export const UPLOAD_API = import.meta.env.VITE_UPLOAD_API ?? 'http://localhost:3000';
export const ANALYTICS_API = import.meta.env.VITE_ANALYTICS_API ?? 'http://localhost:3001';

const STORAGE_KEY = 'naija-bi-session';

// ✅ Best Practice: localStorage read/write lives in exactly one place —
// components never touch it directly, they go through SessionContext,
// which itself delegates here.
export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken(): string | undefined {
  return readSession()?.accessToken;
}

// ✅ Best Practice: this event is how apiFetch tells the rest of the app
// "the session is dead" without importing React or the context module —
// keeps this file framework-agnostic and easy to unit test on its own.
const SESSION_EXPIRED_EVENT = 'naija-bi:session-expired';
export function onSessionExpired(handler: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

async function tryRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH_API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    const current = readSession();
    if (!current) return false;
    writeSession({ ...current, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

interface ApiFetchOptions {
  auth?: boolean;
  retry?: boolean;
}

// ✅ Best Practice: attaches the access token, and on a 401 tries exactly
// one silent refresh-and-retry before giving up — every component calls
// this instead of fetch() directly, so this policy is enforced everywhere.
export async function apiFetch<T>(
  base: string,
  path: string,
  options: RequestInit = {},
  { auth = true, retry = true }: ApiFetchOptions = {}
): Promise<T> {
  const current = readSession();
  const headers = new Headers(options.headers);
  if (auth && current?.accessToken) {
    headers.set('Authorization', `Bearer ${current.accessToken}`);
  }

  const response = await fetch(`${base}${path}`, { ...options, headers });

  if (response.status === 401 && auth && retry && current?.refreshToken) {
    const refreshed = await tryRefresh(current.refreshToken);
    if (refreshed) {
      return apiFetch<T>(base, path, options, { auth, retry: false });
    }
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error('session-expired');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
