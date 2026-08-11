import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import { env } from '@/config/env';

/**
 * Registra @fastify/cookie. Necessário para o refresh token ser lido/setado
 * como cookie httpOnly.
 */
async function cookiePlugin(app: FastifyInstance) {
  await app.register(cookie, {
    // Sem `secret` — não usamos cookies assinados (o refresh token já é opaco e
    // seu hash é o que autentica).
    parseOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    },
  });
}

export default fp(cookiePlugin, { name: 'cookie' });
