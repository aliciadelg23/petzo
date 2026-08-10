import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { HealthController } from './health.controller';
import { healthResponseSchema } from './health.schemas';

/**
 * Rotas do módulo health. Assinatura padrão de módulo Fastify (plugin async).
 * Registrada em `src/modules/index.ts`.
 */
export async function healthRoutes(app: FastifyInstance) {
  const controller = new HealthController();

  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Verifica se a API está no ar',
        description:
          'Endpoint público de liveness. Retorna 200 assim que o Fastify termina de bootstrap.',
        response: {
          200: healthResponseSchema,
        },
      },
    },
    controller.getHealth,
  );
}
