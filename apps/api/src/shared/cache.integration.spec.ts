/**
 * Integration test do RedisCache real.
 * Requer Redis rodando (docker: petzo-redis-dev na porta 6380).
 *
 * Também verifica o comportamento end-to-end do cache no catálogo:
 *   1. GET /categories duas vezes: primeira MISS (DB), segunda HIT (cache).
 *   2. Depois de um POST /products, a invalidação por tag limpa a lista de
 *      produtos e o próximo GET refetcha do DB.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { env } from '../config/env';
import { prisma } from './prisma';
import { RedisCache, stableKey } from './cache';

// Lê a URL do env — respeita o valor de cada ambiente:
//   - dev local (docker-compose):   redis://localhost:6380
//   - CI (GitHub Actions service):  redis://127.0.0.1:6379
// Antes estava hardcoded em 6380 e o spec falhava em qualquer ambiente
// que não fosse o compose local (silent degrade + timeouts no CI).
const REDIS_URL = env.REDIS_URL;

describe('cache / integração com Redis', () => {
  describe('RedisCache direto', () => {
    let cache: RedisCache;

    beforeAll(() => {
      cache = new RedisCache(REDIS_URL);
    });

    afterAll(async () => {
      await cache.disconnect();
    });

    it('set/get/miss/hit funciona no Redis', async () => {
      const key = `test:cache:${Date.now()}`;
      expect(await cache.get(key)).toBeNull();
      await cache.set(key, { hello: 'world' }, 30);
      const hit = await cache.get<{ hello: string }>(key);
      expect(hit).toEqual({ hello: 'world' });
    });

    it('TTL expira (verificado via short EX)', async () => {
      const key = `test:ttl:${Date.now()}`;
      await cache.set(key, 'v', 1);
      await new Promise((r) => setTimeout(r, 1200));
      expect(await cache.get(key)).toBeNull();
    });

    it('invalidateTag apaga TODAS as chaves da tag', async () => {
      const tag = `test:tag:${Date.now()}`;
      const k1 = `test:k1:${Date.now()}`;
      const k2 = `test:k2:${Date.now()}`;
      await cache.set(k1, 'a', 60, [tag]);
      await cache.set(k2, 'b', 60, [tag]);
      await cache.invalidateTag(tag);
      expect(await cache.get(k1)).toBeNull();
      expect(await cache.get(k2)).toBeNull();
    });

    it('stableKey → mesma key para queries equivalentes', () => {
      const a = stableKey('prods', { category: 'caes', page: 1 });
      const b = stableKey('prods', { page: 1, category: 'caes' });
      expect(a).toBe(b);
    });
  });

  describe('cache end-to-end no catálogo (app real)', () => {
    let app: FastifyInstance;
    let injectedCache: RedisCache;

    beforeAll(async () => {
      // env.ts congela NODE_ENV=test na primeira importação — makeCache() cai
      // em NullCache. Para exercitar o pipeline real, sobrescrevemos app.cache
      // com um RedisCache DEPOIS do buildApp. O plugin de cache já decorou o
      // app; usamos assignment direto (Fastify permite após decorate).
      app = await buildApp();
      await app.ready();
      injectedCache = new RedisCache(REDIS_URL);
      (app as unknown as { cache: RedisCache }).cache = injectedCache;
      // Estado limpo — invalida tags que podem ter ficado de runs anteriores
      await injectedCache.invalidateTag('catalog:products');
      await injectedCache.invalidateTag('catalog:categories');
      await injectedCache.invalidateTag('catalog:brands');
    });

    afterAll(async () => {
      await app.close();
      await injectedCache.disconnect();
      await prisma.$disconnect();
    });

    it('segunda GET /categories vem do cache (mesmo com dado alterado no DB)', async () => {
      const first = await app.inject({ method: 'GET', url: '/categories' });
      expect(first.statusCode).toBe(200);
      const firstBody = first.json() as { items: { slug: string; name: string }[] };
      const firstCount = firstBody.items.length;

      // Sabotagem: cria categoria nova no DB DIRETO (bypass API → NÃO invalida cache)
      const sabotage = await prisma.category.create({
        data: { name: 'Sabotage Cat', slug: `sabotage-${Date.now()}` },
      });

      // Segunda chamada → deve vir do cache (não reflete a nova categoria)
      const second = await app.inject({ method: 'GET', url: '/categories' });
      const secondBody = second.json() as { items: { slug: string }[] };
      expect(secondBody.items.length).toBe(firstCount);
      expect(secondBody.items.some((c) => c.slug === sabotage.slug)).toBe(false);

      // Limpa após o teste
      await prisma.category.delete({ where: { id: sabotage.id } });
    });

    it('POST /products invalida catalog:products; próximo GET /products refetcha', async () => {
      // Precisa de STAFF/ADMIN para criar produto
      const login = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@petzo.test', password: 'Password!1' },
      });
      const token = (login.json() as { accessToken: string }).accessToken;

      const cat = await prisma.category.findFirstOrThrow({ where: { slug: 'racao-caes' } });
      const brand = await prisma.brand.findFirstOrThrow({ where: { slug: 'petzo-labs' } });

      // Popula cache
      const before = await app.inject({ method: 'GET', url: '/products?limit=100' });
      const beforeBody = before.json() as { total: number };
      const totalBefore = beforeBody.total;

      // Cria produto — deve invalidar tag catalog:products
      const created = await app.inject({
        method: 'POST',
        url: '/products',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'Cache Bust Product',
          slug: `cache-bust-${Date.now()}`,
          description: 'x',
          categoryId: cat.id,
          brandId: brand.id,
          species: 'DOG',
          price: 1000,
        },
      });
      expect(created.statusCode).toBe(201);
      const newProductId = (created.json() as { id: string }).id;

      // Próximo GET NÃO pode vir do cache antigo — total reflete o novo produto
      const after = await app.inject({ method: 'GET', url: '/products?limit=100' });
      const afterBody = after.json() as { total: number };
      expect(afterBody.total).toBe(totalBefore + 1);

      // Limpa após o teste
      await prisma.product.delete({ where: { id: newProductId } }).catch(() => null);
    });
  });
});
