import { http } from '@/lib/http';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version?: string;
  uptime?: number;
}

/**
 * Consulta o endpoint público /health da API Petzo.
 *
 * Executa somente HTTP REST — o web nunca acessa o Postgres direto.
 * Enquanto a API não existir, esta chamada lançará NetworkError e o consumidor
 * (badge) tratará como "offline".
 */
export function getHealth(): Promise<HealthResponse> {
  return http<HealthResponse>('/health', { cache: 'no-store', timeoutMs: 3000 });
}
