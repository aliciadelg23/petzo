import { env } from '@/config/env';
import { HttpError, NetworkError } from '@/lib/errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  /** Corpo JSON. Serializado automaticamente. */
  body?: unknown;
  /** Query string (será stringified com URLSearchParams). */
  query?: Record<string, string | number | boolean | undefined>;
  /** Headers extras. `Content-Type: application/json` já é setado quando há body. */
  headers?: Record<string, string>;
  /** Passado direto para `fetch(..., { cache })`. Default: `no-store` para segurança. */
  cache?: RequestCache;
  /** Passado direto para `fetch(..., { next })`. Útil para ISR / revalidateTag. */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Timeout em ms (default 10s). */
  timeoutMs?: number;
  /** Se true, não lança erro em respostas não-2xx — retorna Response cru. */
  raw?: boolean;
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
 * Cliente HTTP tipado para consumir a API Petzo (`apps/api`).
 *
 * - Sempre passa por HTTP REST (nunca acessa DB direto).
 * - Lança `HttpError` para respostas != 2xx (contendo status/code/message).
 * - Lança `NetworkError` para falhas antes da resposta (offline, timeout).
 * - Serializa/deserializa JSON automaticamente.
 * - Pode ser chamado tanto em Server Components (fetch nativo do Next) quanto em Client Components.
 *
 * @example
 * const products = await http<Product[]>('/products', { query: { page: 1 } });
 * const created = await http<Order>('/orders', { method: 'POST', body: dto });
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
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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

  if (!res.ok) {
    type ApiErrorPayload = { message?: string; code?: string; details?: unknown };
    let payload: ApiErrorPayload = {};
    try {
      payload = (await res.json()) as ApiErrorPayload;
    } catch {
      // resposta sem corpo JSON — usa fallback abaixo
    }
    throw new HttpError({
      status: res.status,
      message: payload.message ?? `HTTP ${res.status}`,
      code: payload.code,
      details: payload.details,
    });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
