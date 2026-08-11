import { env } from '@/config/env';
import { http } from '@/lib/http';
import type { AuthUser } from './store';
import { saveRefreshToken, clearRefreshToken, getRefreshToken } from './secure-store';

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresIn: number;
}

async function extractSetCookieAndPersist(res: Response): Promise<void> {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return;
  const m = setCookie.match(/petzo_refresh=([^;]+)/);
  if (m?.[1]) await saveRefreshToken(m[1]);
}

async function postWithRawResponse(path: string, body: unknown): Promise<Response> {
  return fetch(`${env.apiUrl}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;
  const p = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
  const err = new Error(p.message ?? `HTTP ${res.status}`);
  (err as unknown as { status: number }).status = res.status;
  (err as unknown as { code?: string }).code = p.code;
  throw err;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<SessionResponse> {
  const res = await postWithRawResponse('/auth/register', input);
  await extractSetCookieAndPersist(res);
  await throwOnError(res);
  return (await res.json()) as SessionResponse;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<SessionResponse> {
  const res = await postWithRawResponse('/auth/login', input);
  await extractSetCookieAndPersist(res);
  await throwOnError(res);
  return (await res.json()) as SessionResponse;
}

export async function logout(): Promise<void> {
  const token = await getRefreshToken();
  try {
    await fetch(`${env.apiUrl}/auth/logout`, {
      method: 'POST',
      headers: token ? { Cookie: `petzo_refresh=${token}` } : {},
    });
  } catch {
    // ignora — vamos limpar local de qualquer jeito
  }
  await clearRefreshToken();
}

export function me(): Promise<AuthUser> {
  return http<AuthUser>('/auth/me');
}
