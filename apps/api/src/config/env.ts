import { z } from 'zod';

/**
 * Env vars da API. Validadas e coeragidas via Zod na primeira importação.
 *
 * `.default(...)` mantém o app rodável em dev sem `.env`. Em `production`,
 * validações mais estritas rodam ao final para impedir bootstrap com secrets
 * padrão.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  API_PORT: z.coerce.number().int().positive().default(3333),
  API_HOST: z.string().default('0.0.0.0'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((raw) =>
      raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://petzo:petzo@localhost:5433/petzo'),

  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(1).default('change-me-in-production'),
  JWT_REFRESH_SECRET: z.string().min(1).default('change-me-in-production'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  /**
   * Estratégia do motor de recomendação. Valores futuros:
   *   `ml`         → serviço interno de machine learning
   *   `external`   → integração externa (Amazon Personalize, etc.)
   *   `ai`         → geração via LLM
   * Trocar aqui NÃO altera a API pública (endpoint + response shape).
   */
  RECOMMENDATION_ENGINE: z.string().default('rules-v1'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`[env] variáveis inválidas:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

// Guardrails de produção: falhar cedo se secrets ainda são default.
if (env.NODE_ENV === 'production') {
  const insecure: string[] = [];
  if (env.JWT_ACCESS_SECRET === 'change-me-in-production') insecure.push('JWT_ACCESS_SECRET');
  if (env.JWT_REFRESH_SECRET === 'change-me-in-production') insecure.push('JWT_REFRESH_SECRET');
  if (insecure.length > 0) {
    throw new Error(
      `[env] em NODE_ENV=production, defina os seguintes secrets: ${insecure.join(', ')}`,
    );
  }
}
