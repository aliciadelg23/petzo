/**
 * Ponto único de troca de motor. Rotas/service dependem SÓ desta função.
 * Substituir "rules-v1" por "ml" / "external" no futuro é uma mudança
 * localizada aqui — a API pública (endpoint, response shape) NÃO muda.
 *
 * Exemplo futuro:
 *
 *   case 'ml':
 *     return new MLRecommendationEngine(prisma, env.ML_SERVICE_URL);
 *   case 'external':
 *     return new ExternalRecommendationEngine(prisma, env.PERSONALIZE_ARN);
 *
 * Env var: `RECOMMENDATION_ENGINE` (default 'rules-v1').
 */
import type { PrismaClient } from '@prisma/client';
import type { RecommendationEngine } from '../recommendation.types';
import { RulesBasedRecommendationEngine } from './rules-based/rules-based.engine';

export function makeRecommendationEngine(
  prisma: PrismaClient,
  strategy: string,
): RecommendationEngine {
  switch (strategy) {
    case 'rules-v1':
    default:
      return new RulesBasedRecommendationEngine(prisma);
  }
}
