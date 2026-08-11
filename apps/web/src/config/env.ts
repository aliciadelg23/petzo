import { z } from 'zod';

/**
 * Env vars do web.
 *
 * Duas categorias:
 *
 * 1) NEXT_PUBLIC_*  →  vai para o BUNDLE DO BROWSER (visível no HTML).
 *    Nunca colocar secret aqui. Todo import é seguro em Server + Client.
 *
 * 2) Server-only (sem prefixo NEXT_PUBLIC_) → só existem em runtime do
 *    Node do Next. Não vazam para o bundle. Devem ser lidos APENAS em
 *    Server Components / route handlers / middleware.
 */
const publicEnvSchema = z.object({
  /** URL da API vista pelo BROWSER (loopback ao host, CDN, etc.). */
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL precisa ser uma URL válida.')
    .refine((v) => !v.endsWith('/'), 'NEXT_PUBLIC_API_URL não deve terminar com "/"')
    .default('http://localhost:3333'),
  /**
   * URL pública do próprio site — usada em SEO (canonical, JSON-LD, OG).
   * NUNCA usar NEXT_PUBLIC_API_URL para isso — o crawler indexa a URL
   * do site, não do backend.
   */
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url('NEXT_PUBLIC_SITE_URL precisa ser uma URL válida.')
    .refine((v) => !v.endsWith('/'), 'NEXT_PUBLIC_SITE_URL não deve terminar com "/"')
    .default('http://localhost:3000'),
});

const serverEnvSchema = z.object({
  /**
   * URL da API vista pelo SERVIDOR do Next (SSR/RSC/route-handler).
   * Em Docker esse valor difere do NEXT_PUBLIC_API_URL — SSR usa o
   * hostname interno da rede do compose (ex.: http://api:3333), enquanto
   * o browser usa o host mapeado (ex.: http://localhost:3333).
   * Se ausente, cai no NEXT_PUBLIC_API_URL — comportamento antigo,
   * backwards-compatible.
   */
  INTERNAL_API_URL: z
    .string()
    .url('INTERNAL_API_URL precisa ser uma URL válida.')
    .refine((v) => !v.endsWith('/'), 'INTERNAL_API_URL não deve terminar com "/"')
    .optional(),
});

const parsedPublic = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsedPublic.success) {
  const issues = parsedPublic.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`[env] variáveis inválidas:\n${issues}`);
}

const parsedServer = serverEnvSchema.safeParse({
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
});

if (!parsedServer.success) {
  const issues = parsedServer.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`[env] variáveis inválidas:\n${issues}`);
}

export const env = parsedPublic.data;
export type Env = z.infer<typeof publicEnvSchema>;

/**
 * URL da API para uso do LADO SERVIDOR. Usa INTERNAL_API_URL quando
 * definido (containers), senão cai no NEXT_PUBLIC_API_URL.
 *
 * ⚠️ NÃO importar isso em Client Components — INTERNAL_API_URL não
 * está no bundle do browser.
 */
export const serverApiUrl: string =
  parsedServer.data.INTERNAL_API_URL ?? parsedPublic.data.NEXT_PUBLIC_API_URL;
