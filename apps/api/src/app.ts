import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from '@/config/env';
import errorHandler from '@/plugins/error-handler';
import swagger from '@/plugins/swagger';
import cookiePlugin from '@/plugins/cookie';
import jwtPlugin from '@/plugins/jwt';
import authHooks from '@/plugins/auth-hooks';
import cachePlugin from '@/plugins/cache';
import { registerModules } from '@/modules';

/**
 * Fábrica da instância Fastify. Isolada em uma função pura para permitir
 * testes com `fastify.inject()` sem abrir porta.
 *
 * Ordem importante:
 * 1. type-provider (validator/serializer)   — antes de qualquer rota com schema
 * 2. helmet + cors                          — antes das rotas
 * 3. sensible (httpErrors)                  — usado por plugins e handlers
 * 4. swagger                                — precisa vir antes das rotas p/ capturar schemas
 * 5. error-handler                          — global
 * 6. modules                                — por último
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.LOG_LEVEL,
            transport:
              env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
                  }
                : undefined,
          },
    genReqId: () => crypto.randomUUID(),
    ajv: { customOptions: { removeAdditional: 'all', coerceTypes: true, useDefaults: true } },
  }).withTypeProvider<ZodTypeProvider>();

  // Type provider (Zod)
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Segurança / headers
  await app.register(helmet, { global: true });

  // Rate-limit global. Rotas de auth aplicam limites mais estritos localmente
  // via `config.rateLimit`. Desligado em `test` para não flakear specs em
  // rajada dentro do mesmo processo (Fastify em Vitest reusa a instância).
  if (env.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
      global: true,
      max: 300,
      timeWindow: '1 minute',
      // Chave por IP; identifica login/register/refresh por email na rota.
      keyGenerator: (req) => req.ip,
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
      },
    });
  }

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGINS.length === 1 && env.CORS_ORIGINS[0] === '*' ? true : env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // httpErrors, notFound helpers
  await app.register(sensible);

  // Cookies + JWT + auth hooks (auth-hooks depende de jwt)
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(authHooks);

  // Cache (Redis) — decora app.cache; sem-op em NODE_ENV=test ou CACHE_ENABLED=false
  await app.register(cachePlugin);

  // Swagger — precisa vir antes das rotas
  await app.register(swagger);

  // Handler global de erros
  await app.register(errorHandler);

  // Módulos de domínio
  await app.register(registerModules);

  return app;
}
