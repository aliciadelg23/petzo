import Redis from 'ioredis';
import { createHash } from 'node:crypto';
import { env } from '@/config/env';

/**
 * Interface do cache. NÃO expõe detalhes do Redis — permite trocar
 * a implementação sem tocar em quem consome.
 */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  /** TTL em segundos (obrigatório — nunca cachear sem TTL). */
  set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void>;
  del(keys: string | string[]): Promise<void>;
  /**
   * Invalida TODAS as chaves registradas sob uma tag. Usado em writes
   * para "estourar" o cache do domínio afetado (ex: produtos, categorias).
   */
  invalidateTag(tag: string): Promise<void>;
  /** Encerra conexões (para shutdown gracioso). */
  disconnect(): Promise<void>;
  /** Métricas para observabilidade e testes. */
  stats(): { hits: number; misses: number };
  /** Zera métricas (útil em testes). */
  resetStats(): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEY_NS = 'petzo:cache';
const TAG_NS = 'petzo:tag';

function nsKey(key: string): string {
  return `${KEY_NS}:${key}`;
}
function nsTag(tag: string): string {
  return `${TAG_NS}:${tag}`;
}

/**
 * Gera chave estável a partir de um objeto. Ordena as chaves antes de
 * serializar → duas queries equivalentes com ordem de props diferente
 * geram a MESMA chave (importante para cache HIT).
 */
export function stableKey(prefix: string, obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const normalized: Record<string, unknown> = {};
  for (const k of keys) {
    if (obj[k] === undefined) continue;
    normalized[k] = obj[k];
  }
  const json = JSON.stringify(normalized);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
  return `${prefix}:${hash}`;
}

// ---------------------------------------------------------------------------
// NullCache — pass-through. Usado em test / cache desligado.
// ---------------------------------------------------------------------------

export class NullCache implements Cache {
  private _stats = { hits: 0, misses: 0 };
  async get<T>(_key: string): Promise<T | null> {
    this._stats.misses += 1;
    return null;
  }
  async set<T>(_key: string, _value: T, _ttl: number, _tags?: string[]): Promise<void> {}
  async del(_keys: string | string[]): Promise<void> {}
  async invalidateTag(_tag: string): Promise<void> {}
  async disconnect(): Promise<void> {}
  stats() {
    return { ...this._stats };
  }
  resetStats(): void {
    this._stats = { hits: 0, misses: 0 };
  }
}

// ---------------------------------------------------------------------------
// MemoryCache — Map em processo. Útil para unit tests determinísticos.
// ---------------------------------------------------------------------------

export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private tags = new Map<string, Set<string>>();
  private _stats = { hits: 0, misses: 0 };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(nsKey(key));
    if (!entry) {
      this._stats.misses += 1;
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(nsKey(key));
      this._stats.misses += 1;
      return null;
    }
    this._stats.hits += 1;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
    const k = nsKey(key);
    this.store.set(k, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    for (const t of tags) {
      const s = this.tags.get(t) ?? new Set<string>();
      s.add(k);
      this.tags.set(t, s);
    }
  }

  async del(keys: string | string[]): Promise<void> {
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const k of arr) this.store.delete(nsKey(k));
  }

  async invalidateTag(tag: string): Promise<void> {
    const set = this.tags.get(tag);
    if (!set) return;
    for (const k of set) this.store.delete(k);
    this.tags.delete(tag);
  }

  async disconnect(): Promise<void> {
    this.store.clear();
    this.tags.clear();
  }

  stats() {
    return { ...this._stats };
  }
  resetStats(): void {
    this._stats = { hits: 0, misses: 0 };
  }
}

// ---------------------------------------------------------------------------
// RedisCache — implementação de produção.
// ---------------------------------------------------------------------------

export class RedisCache implements Cache {
  private redis: Redis;
  private _stats = { hits: 0, misses: 0 };

  constructor(url: string) {
    this.redis = new Redis(url, {
      lazyConnect: false,
      // Queue de comandos enquanto conecta (buffer inicial) — necessário para
      // a primeira chamada não perder por race entre construção e conexão.
      enableOfflineQueue: true,
      // Se Redis cair no meio, comandos falham depois de 2 retries em vez de
      // bloquear indefinidamente.
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
    });
    // Evita crash do processo em erros de conexão — cachear vira no-op
    this.redis.on('error', (err: Error) => {
      console.warn('[cache] redis error (degrading to miss):', err.message);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(nsKey(key));
      if (raw === null) {
        this._stats.misses += 1;
        return null;
      }
      this._stats.hits += 1;
      return JSON.parse(raw) as T;
    } catch {
      this._stats.misses += 1;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
    const k = nsKey(key);
    try {
      const pipe = this.redis.pipeline();
      pipe.set(k, JSON.stringify(value), 'EX', ttlSeconds);
      for (const t of tags) {
        pipe.sadd(nsTag(t), k);
        // Tag set NÃO expira sozinho — cresce na proporção dos writes de cache.
        // Aceitável: em write no domínio invalidamos tudo de uma vez.
      }
      await pipe.exec();
    } catch {
      // no-op em caso de falha
    }
  }

  async del(keys: string | string[]): Promise<void> {
    const arr = Array.isArray(keys) ? keys : [keys];
    if (arr.length === 0) return;
    try {
      await this.redis.del(...arr.map(nsKey));
    } catch {
      // no-op
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      const members = await this.redis.smembers(nsTag(tag));
      if (members.length > 0) {
        await this.redis.del(...members, nsTag(tag));
      } else {
        await this.redis.del(nsTag(tag));
      }
    } catch {
      // no-op
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }

  stats() {
    return { ...this._stats };
  }
  resetStats(): void {
    this._stats = { hits: 0, misses: 0 };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Escolha da implementação:
 *  - test           → NullCache SEMPRE (nenhum teste depende de Redis a menos
 *                     que instancie explicitamente)
 *  - CACHE_ENABLED=false → NullCache
 *  - default        → RedisCache(REDIS_URL)
 */
export function makeCache(): Cache {
  if (env.NODE_ENV === 'test') return new NullCache();
  if (!env.CACHE_ENABLED) return new NullCache();
  return new RedisCache(env.REDIS_URL);
}

// ---------------------------------------------------------------------------
// TTLs — constantes por domínio (documentado em docs/performance-strategy.md)
// ---------------------------------------------------------------------------

export const TTL = {
  /** Lista de produtos filtrada por query — vale poucos segundos, evita spike no scroll infinito. */
  PRODUCTS_LIST: 30,
  /** Detalhe de produto — invalidado por write. */
  PRODUCT_DETAIL: 60,
  /** Categorias / marcas — mudam pouco. */
  CATEGORIES: 300,
  BRANDS: 300,
} as const;

/** Tags para invalidação em bulk. */
export const TAG = {
  CATALOG_PRODUCTS: 'catalog:products',
  CATALOG_CATEGORIES: 'catalog:categories',
  CATALOG_BRANDS: 'catalog:brands',
} as const;

/**
 * Envolve uma função assíncrona com cache read-through:
 *   1. Tenta buscar por key. Se HIT, retorna direto.
 *   2. MISS → chama `fetch()`, armazena e retorna.
 * `tags` são usadas para invalidação por domínio.
 *
 * Single-flight anti-thundering-herd:
 *   Quando várias requisições atingem MISS simultâneo na MESMA key,
 *   apenas UMA chama `fetch()`; as demais compartilham a mesma Promise
 *   pendente. Sem isso, 100 requests concorrentes viram 100 queries no
 *   Postgres logo após uma invalidação.
 *
 *   O map é in-process (por Node worker). Em fleet horizontal isso ainda
 *   reduz o fan-out por N-nós; para dedupe absoluto entre nós seria
 *   necessário um lock distribuído no Redis (out of scope deste fix).
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function readThrough<T>(
  cache: Cache,
  key: string,
  ttlSeconds: number,
  tags: string[],
  fetch: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;

  // Se já existe um fetch em voo para esta key, aproveita a mesma Promise.
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const value = await fetch();
      await cache.set(key, value, ttlSeconds, tags);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}
