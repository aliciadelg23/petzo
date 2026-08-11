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

  REDIS_URL: z.string().url().default('redis://localhost:6380'),
  /**
   * Liga o cache Redis. Em `test` fica desligado por default (integration
   * tests não devem depender de Redis subir). Testes que precisam de cache
   * (cache-specific spec) sobrescrevem via env.
   */
  CACHE_ENABLED: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .default(true),

  // Em dev o default corre; em produção o guardrail abaixo exige rotação.
  // 32 bytes é o mínimo para HS256 (256 bits de entropia). Zod só barra
  // secrets tecnicamente inválidos; a decisão "não é o placeholder" fica
  // no guardrail de produção.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa de pelo menos 32 caracteres').default('change-me-in-production-please-rotate-32b'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET precisa de pelo menos 32 caracteres').default('change-me-in-production-please-rotate-32b'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
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

// Guardrails de produção: falhar cedo se secrets ainda são o placeholder.
// Casa qualquer variação que comece com "change-me-in-production" — pega
// tanto o default explícito quanto pequenas edições ingênuas.
if (env.NODE_ENV === 'production') {
  const insecure: string[] = [];
  if (env.JWT_ACCESS_SECRET.startsWith('change-me-in-production')) insecure.push('JWT_ACCESS_SECRET');
  if (env.JWT_REFRESH_SECRET.startsWith('change-me-in-production')) insecure.push('JWT_REFRESH_SECRET');
  if (insecure.length > 0) {
    throw new Error(
      `[env] em NODE_ENV=production, defina os seguintes secrets com ao menos 32 caracteres aleatórios: ${insecure.join(', ')}`,
    );
  }
}
