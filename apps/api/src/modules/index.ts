import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health/health.routes';

/**
 * Registra todos os módulos de domínio da API.
 * Novos módulos (auth, users, catalog, ...) são adicionados aqui.
 */
export async function registerModules(app: FastifyInstance) {
  await app.register(healthRoutes);
}
