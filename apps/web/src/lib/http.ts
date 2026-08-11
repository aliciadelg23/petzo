import { env } from '@/config/env';
import { HttpError, NetworkError } from '@/lib/errors';
import { useAuthStore } from '@/features/auth/store';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  timeoutMs?: number;
  raw?: boolean;
  /** Se true, não injeta Authorization e não tenta refresh no 401. */
  skipAuth?: boolean;
  /** Uso interno da lógica de retry para não recursar mais de uma vez. */
  _isRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, env.NEXT_PUBLIC_API_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Tenta renovar o access token via /auth/refresh (usa o cookie httpOnly).
 * Se falhar, limpa a sessão. Retorna o novo access token, ou null.
 *
 * SINGLE-FLIGHT: sob rajada de 401s (várias queries paralelas do TanStack),
 * TODAS as chamadas concorrentes compartilham a MESMA Promise pendente.
 * Sem isso, N requests disparam N /auth/refresh — o primeiro rotaciona o
 * refresh token e os demais falham com o token já revogado, deslogando o
 * usuário mesmo tendo sessão válida.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const url = new URL('/auth/refresh', env.NEXT_PUBLIC_API_URL).toString();
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`refresh ${res.status}`);
    const data = (await res.json()) as {
      user: import('@/features/auth/store').AuthUser;
      accessToken: string;
    };
    useAuthStore.getState().setSession({ user: data.user, accessToken: data.accessToken });
    return data.accessToken;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Cliente HTTP tipado para consumir a API Petzo.
 *
 * - Injeta `Authorization: Bearer <accessToken>` automaticamente (opt-out via skipAuth).
 * - `credentials: 'include'` — envia cookies (necessário para refresh token).
 * - No 401 (com token), tenta refresh uma vez e refaz o request.
 */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    headers = {},
    cache = 'no-store',
    next,
    timeoutMs = 10_000,
    raw = false,
    skipAuth = false,
    _isRetry = false,
  } = options;

  const accessToken = skipAuth ? null : useAuthStore.getState().accessToken;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    signal: controller.signal,
    ...(next ? { next } : {}),
  };

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), init);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new NetworkError('Timeout ao consultar a API.');
    }
    throw new NetworkError();
  }
  clearTimeout(timeout);

  if (raw) return res as unknown as T;

  // 401 + tinha access token → tentar refresh e refazer 1x
  if (res.status === 401 && !skipAuth && !_isRetry && accessToken) {
    const newAccessToken = await tryRefresh();
    if (newAccessToken) {
      return http<T>(path, { ...options, _isRetry: true });
    }
  }

  if (!res.ok) {
    type ApiErrorPayload = { message?: string; code?: string; details?: unknown };
    let payload: ApiErrorPayload = {};
    try {
      payload = (await res.json()) as ApiErrorPayload;
    } catch {
      // sem body JSON
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
