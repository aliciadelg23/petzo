import { env } from '@/config/env';
import { HttpError, NetworkError } from '@/lib/errors';
import { useAuthStore, type AuthUser } from '@/features/auth/store';
import { getRefreshToken, saveRefreshToken } from '@/features/auth/secure-store';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuth?: boolean;
  /** interno */
  _retry?: boolean;
}

function buildUrl(path: string): string {
  return `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * A API foi desenhada web-first: /auth/refresh lê o token do cookie
 * `petzo_refresh`. Como RN não tem cookie storage nativo, montamos o header
 * `Cookie` manualmente com o valor que temos no SecureStore. Quando o servidor
 * responder com `set-cookie` do novo token rotacionado, extraímos e persistimos.
 */
async function tryRefresh(): Promise<string | null> {
  const token = await getRefreshToken();
  if (!token) return null;
  try {
    const res = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Cookie: `petzo_refresh=${token}`,
      },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as {
      user: AuthUser;
      accessToken: string;
    };
    useAuthStore.getState().setSession({ user: data.user, accessToken: data.accessToken });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const m = setCookie.match(/petzo_refresh=([^;]+)/);
      if (m?.[1]) await saveRefreshToken(m[1]);
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = 15_000,
    skipAuth = false,
    _retry = false,
  } = options;

  const accessToken = skipAuth ? null : useAuthStore.getState().accessToken;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new NetworkError('Timeout ao consultar a API.');
    }
    throw new NetworkError();
  }
  clearTimeout(timer);

  if (res.status === 401 && !skipAuth && !_retry && accessToken) {
    const newTok = await tryRefresh();
    if (newTok) {
      return http<T>(path, { ...options, _retry: true });
    }
    useAuthStore.getState().clearSession();
  }

  if (!res.ok) {
    let payload: { message?: string; code?: string; details?: unknown } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      // sem corpo JSON
    }
    throw new HttpError({
      status: res.status,
      message: payload.message ?? `HTTP ${res.status}`,
      code: payload.code,
      details: payload.details,
    });
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
