import type { FastifyReply, FastifyRequest } from 'fastify';
import { HealthService } from './health.service';

/**
 * Controller — adapta o par (request, reply) do Fastify à API do service.
 * Sem lógica de negócio aqui: apenas orquestração de I/O.
 */
export class HealthController {
  constructor(private readonly service: HealthService = new HealthService()) {}

  getHealth = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = this.service.getHealth();
    return reply.status(200).send(result);
  };
}
