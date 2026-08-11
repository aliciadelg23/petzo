import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/shared/errors';
import type { RecommendationEngine, RecommendationResult } from './recommendation.types';

const DISCLAIMER =
  'Recomendações comerciais baseadas em regras determinísticas. NÃO substituem ' +
  'aconselhamento veterinário. Consulte um profissional antes de decisões de saúde.';

export class RecommendationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly engine: RecommendationEngine,
  ) {}

  async recommendForPet(input: {
    userId: string;
    petId: string;
    limit: number;
    /** Se true, permite ver recomendações de qualquer pet (STAFF/ADMIN). */
    allowAnyOwner?: boolean;
  }): Promise<RecommendationResult> {
    const pet = await this.prisma.pet.findUnique({ where: { id: input.petId } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    if (!input.allowAnyOwner && pet.userId !== input.userId) {
      // Retornar 404 (não 403) para não vazar existência de pets alheios.
      throw new NotFoundError('Pet não encontrado.');
    }

    const items = await this.engine.recommendForPet({
      pet,
      userId: pet.userId,
      limit: input.limit,
    });

    return {
      petId: pet.id,
      strategy: this.engine.strategy,
      disclaimer: DISCLAIMER,
      items,
    };
  }
}
