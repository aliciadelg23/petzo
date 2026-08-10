import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import type { RoleName } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '@/shared/errors';
import type { AccessTokenPayload } from './jwt';

// Augment de FastifyInstance para expor `authenticate` e `authorize`.
declare module 'fastify' {
  interface FastifyInstance {
    /** Hook: verifica o access token do header Authorization e popula request.currentUser. */
    authenticate: preHandlerAsyncHookHandler;
    /** Factory: retorna um hook que exige uma das roles. Aplica `authenticate` implicitamente. */
    authorize: (...roles: RoleName[]) => preHandlerAsyncHookHandler;
  }
  interface FastifyRequest {
    currentUser?: AccessTokenPayload;
  }
}

async function verifyAndSet(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token de acesso inválido ou ausente.');
  }
  request.currentUser = request.user as AccessTokenPayload;
}

async function authHooksPlugin(app: FastifyInstance) {
  const authenticate: preHandlerAsyncHookHandler = async (request, _reply) => {
    await verifyAndSet(request);
  };

  const authorize = (...roles: RoleName[]): preHandlerAsyncHookHandler => {
    return async (request, _reply) => {
      if (!request.currentUser) {
        await verifyAndSet(request);
      }
      const role = request.currentUser?.role;
      if (!role || !roles.includes(role)) {
        throw new ForbiddenError('Sua role não permite esta ação.');
      }
    };
  };

  app.decorate('authenticate', authenticate);
  app.decorate('authorize', authorize);
}

// dependencies: precisa que @fastify/jwt esteja registrado antes
export default fp(authHooksPlugin, { name: 'auth-hooks', dependencies: ['jwt'] });
