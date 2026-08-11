import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { makeCache, type Cache } from '@/shared/cache';

/**
 * Decora `app.cache` com uma ÚNICA instância do Cache — reusada por todos os
 * módulos. Evita múltiplas conexões ao Redis.
 * Encerra graciosamente em `onClose`.
 */
declare module 'fastify' {
  interface FastifyInstance {
    cache: Cache;
  }
}

async function cachePlugin(app: FastifyInstance) {
  const cache = makeCache();
  app.decorate('cache', cache);
  app.addHook('onClose', async () => {
    await cache.disconnect();
  });
}

export default fp(cachePlugin, { name: 'cache' });
