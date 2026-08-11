import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { RoleName } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Payload do access token (JWT).
 */
export interface AccessTokenPayload {
  sub: string;
  role: RoleName;
  email: string;
}

// Augment do @fastify/jwt para tipar user (do JWT) fortemente.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

async function jwtPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: {
      // TTL individual por token via `expiresIn` no signAccessToken()
      iss: 'petzo-api',
    },
    verify: {
      allowedIss: 'petzo-api',
    },
  });
}

export default fp(jwtPlugin, { name: 'jwt' });
