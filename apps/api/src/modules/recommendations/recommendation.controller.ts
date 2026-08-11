import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@/shared/errors';
import type { RecommendationService } from './recommendation.service';
import type { RecommendationsQuery } from './recommendation.schemas';

export class RecommendationController {
  constructor(private readonly service: RecommendationService) {}

  private requireUser(request: FastifyRequest): { id: string; role: string } {
    const u = request.currentUser;
    if (!u) throw new UnauthorizedError('Autenticação necessária.');
    return { id: u.sub, role: u.role };
  }

  recommendForPet = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, role } = this.requireUser(request);
    const { petId } = request.params as { petId: string };
    const { limit } = request.query as RecommendationsQuery;

    const result = await this.service.recommendForPet({
      userId: id,
      petId,
      limit,
      // STAFF/ADMIN podem ver recomendações de qualquer pet — útil para
      // suporte investigar o que o algoritmo devolveria a um cliente.
      allowAnyOwner: role === 'ADMIN' || role === 'STAFF',
    });
    return reply.status(200).send(result);
  };
}
