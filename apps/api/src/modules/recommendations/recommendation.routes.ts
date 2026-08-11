import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { makeRecommendationEngine } from './engines/engine-factory';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import {
  petIdParamSchema,
  recommendationResultSchema,
  recommendationsQuerySchema,
} from './recommendation.schemas';
import { env } from '@/config/env';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export async function recommendationRoutes(app: FastifyInstance) {
  const engine = makeRecommendationEngine(prisma, env.RECOMMENDATION_ENGINE);
  const service = new RecommendationService(prisma, engine);
  const controller = new RecommendationController(service);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/pets/:petId/recommendations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['recommendations'],
        summary: 'Retorna recomendações comerciais para um pet do usuário.',
        description:
          'Recomendações determinísticas baseadas em regras (espécie, idade, ' +
          'peso, categorias compradas, wishlist, popularidade). NÃO utiliza IA ' +
          'generativa e NÃO faz sugestões médicas/veterinárias.',
        security: [{ bearerAuth: [] }],
        params: petIdParamSchema,
        querystring: recommendationsQuerySchema,
        response: {
          200: recommendationResultSchema,
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    controller.recommendForPet,
  );
}
