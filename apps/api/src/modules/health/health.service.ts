import type { HealthResponse } from './health.schemas';

/**
 * Service do módulo health.
 *
 * Sem repository — health não persiste nem lê estado. Se um dia precisarmos
 * checar Postgres/Redis (readiness), o check vive AQUI (no service) e usa o
 * repositório correspondente. A rota permanece a mesma.
 */
export class HealthService {
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }
}
