import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryCache, NullCache, readThrough, stableKey } from './cache';

describe('stableKey', () => {
  it('gera a mesma key para ordens diferentes de chaves', () => {
    const a = stableKey('prods', { category: 'caes', page: 1, limit: 20 });
    const b = stableKey('prods', { limit: 20, category: 'caes', page: 1 });
    expect(a).toBe(b);
  });

  it('ignora undefined explícito', () => {
    const a = stableKey('prods', { category: 'caes', brand: undefined });
    const b = stableKey('prods', { category: 'caes' });
    expect(a).toBe(b);
  });

  it('difere quando valores diferem', () => {
    const a = stableKey('prods', { category: 'caes' });
    const b = stableKey('prods', { category: 'gatos' });
    expect(a).not.toBe(b);
  });
});

describe('NullCache', () => {
  it('get retorna null, set/del são no-op, contam MISS', async () => {
    const c = new NullCache();
    await c.set('x', 1, 60);
    expect(await c.get('x')).toBeNull();
    expect(c.stats().misses).toBe(1);
    expect(c.stats().hits).toBe(0);
  });
});

describe('MemoryCache', () => {
  let cache: MemoryCache;
  beforeEach(() => {
    cache = new MemoryCache();
  });

  it('set/get devolve valor tipado', async () => {
    await cache.set('k', { n: 42 }, 60);
    const hit = await cache.get<{ n: number }>('k');
    expect(hit).toEqual({ n: 42 });
    expect(cache.stats()).toEqual({ hits: 1, misses: 0 });
  });

  it('miss inicial + hit após set', async () => {
    expect(await cache.get('x')).toBeNull();
    await cache.set('x', 'v', 60);
    expect(await cache.get('x')).toBe('v');
    expect(cache.stats()).toEqual({ hits: 1, misses: 1 });
  });

  it('expira ao passar do TTL', async () => {
    vi.useFakeTimers();
    await cache.set('short', 'v', 1); // 1 segundo
    expect(await cache.get('short')).toBe('v');
    vi.advanceTimersByTime(2000);
    expect(await cache.get('short')).toBeNull();
    vi.useRealTimers();
  });

  it('del remove chave', async () => {
    await cache.set('rm', 'v', 60);
    await cache.del('rm');
    expect(await cache.get('rm')).toBeNull();
  });

  it('invalidateTag remove todas as chaves da tag', async () => {
    await cache.set('a', 1, 60, ['products']);
    await cache.set('b', 2, 60, ['products']);
    await cache.set('c', 3, 60, ['categories']);
    await cache.invalidateTag('products');
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get<number>('c')).toBe(3);
  });
});

describe('readThrough', () => {
  it('MISS chama fetch, HIT não chama de novo', async () => {
    const cache = new MemoryCache();
    const fetch = vi.fn().mockResolvedValue({ items: [1, 2] });

    const first = await readThrough(cache, 'k', 60, ['tag'], fetch);
    const second = await readThrough(cache, 'k', 60, ['tag'], fetch);

    expect(first).toEqual({ items: [1, 2] });
    expect(second).toEqual({ items: [1, 2] });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.stats()).toEqual({ hits: 1, misses: 1 });
  });

  it('após invalidateTag, próxima chamada rehidrata', async () => {
    const cache = new MemoryCache();
    let counter = 0;
    const fetch = vi.fn(async () => ++counter);

    await readThrough(cache, 'k', 60, ['tag'], fetch); // 1
    await readThrough(cache, 'k', 60, ['tag'], fetch); // hit
    await cache.invalidateTag('tag');
    const v3 = await readThrough(cache, 'k', 60, ['tag'], fetch); // fetches again

    expect(v3).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exceção no fetch NÃO é cacheada', async () => {
    const cache = new MemoryCache();
    const fetch = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');

    await expect(readThrough(cache, 'k', 60, [], fetch)).rejects.toThrow('boom');
    const v = await readThrough(cache, 'k', 60, [], fetch);
    expect(v).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
