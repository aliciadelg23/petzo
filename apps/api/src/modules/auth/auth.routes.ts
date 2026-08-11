import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  authSessionSchema,
  loginBodySchema,
  meResponseSchema,
  publicUserSchema,
  registerBodySchema,
} from './auth.schemas';

const bodyAuthSessionSchema = z.object({
  user: publicUserSchema,
  accessToken: z.string(),
  accessTokenExpiresIn: z.number().int().positive(),
});

const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  const repo = new AuthRepository(prisma);
  const service = new AuthService(repo, app);
  const controller = new AuthController(service);

  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // Rate-limits estritos para os endpoints sensíveis. Chave = IP + email quando
  // presente no body, para evitar que um cliente NAT'd bloqueie o outro.
  // Em NODE_ENV=test o plugin nem é registrado (ver app.ts) — `config.rateLimit`
  // é ignorado silenciosamente nesses casos.
  const authKey = (req: import('fastify').FastifyRequest) => {
    const email = (req.body as { email?: string } | undefined)?.email;
    return email ? `${req.ip}:${email.toLowerCase()}` : req.ip;
  };

  zApp.post(
    '/auth/register',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute', keyGenerator: authKey } },
      schema: {
        tags: ['auth'],
        summary: 'Cria um usuário CUSTOMER e devolve access + refresh (cookie).',
        body: registerBodySchema,
        response: {
          201: bodyAuthSessionSchema,
          409: errorResponseSchema,
          400: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    controller.register,
  );

  zApp.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute', keyGenerator: authKey } },
      schema: {
        tags: ['auth'],
        summary: 'Autentica com email + senha.',
        body: loginBodySchema,
        response: {
          200: bodyAuthSessionSchema,
          401: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    controller.login,
  );

  zApp.post(
    '/auth/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Rotaciona o refresh token (via cookie) e devolve novo access token.',
        response: {
          200: bodyAuthSessionSchema,
          401: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    controller.refresh,
  );

  zApp.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Revoga o refresh token atual e limpa o cookie.',
        response: {
          204: z.void(),
        },
      },
    },
    controller.logout,
  );

  zApp.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Retorna o usuário autenticado.',
        security: [{ bearerAuth: [] }],
        response: {
          200: meResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    controller.me,
  );

  // referência para linter (usa authSessionSchema noutro arquivo eventualmente)
  void authSessionSchema;
}
