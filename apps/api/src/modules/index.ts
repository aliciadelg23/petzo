import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health/health.routes';
import { authRoutes } from './auth/auth.routes';

/**
 * Registra todos os módulos de domínio da API.
 * Novos módulos (users, catalog, ...) são adicionados aqui.
 */
export async function registerModules(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
}
