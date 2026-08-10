import { z } from 'zod';

/**
 * Env vars públicas do client. TODAS precisam do prefixo `NEXT_PUBLIC_`
 * para o Next.js expor no bundle do browser.
 *
 * Server-only envs (secrets, tokens) NÃO devem viver aqui.
 * Este arquivo é seguro para importar em Server e Client Components.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL precisa ser uma URL válida.')
    .refine((v) => !v.endsWith('/'), 'NEXT_PUBLIC_API_URL não deve terminar com "/"')
    .default('http://localhost:3333'),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`[env] variáveis inválidas:\n${issues}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof publicEnvSchema>;
