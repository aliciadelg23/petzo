import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import fp from 'fastify-plugin';
import { AppError } from '@/shared/errors';

/**
 * Handler global de erros. Converte qualquer exceção em um payload uniforme
 * `{ code, message, details?, requestId }`.
 *
 * Ordem de match:
 * 1. Erros de validação Zod (400)
 * 2. AppError (usa statusCode + code definidos)
 * 3. Erros Fastify com statusCode (4xx passam adiante como estão)
 * 4. Resto → 500 INTERNAL_ERROR (payload genérico; detalhes só em log)
 */
async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    // 1. Validação Zod
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: error.validation,
        requestId,
      });
    }

    // 2. AppError (nossos erros de domínio)
    if (error instanceof AppError) {
      request.log.info({ err: error, requestId }, 'AppError');
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      });
    }

    // 3. Erros Fastify já com statusCode (4xx do sensible, rate-limit, etc.)
    if (
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return reply.status(error.statusCode).send({
        code: error.code ?? 'BAD_REQUEST',
        message: error.message,
        requestId,
      });
    }

    // 4. Fallback — 500
    request.log.error({ err: error, requestId }, 'unhandled error');
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Erro inesperado. Consulte o log com o requestId.',
      requestId,
    });
  });

  // 404 handler (também padroniza para não vazar "Not Found" cru)
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      code: 'NOT_FOUND',
      message: `Rota não encontrada: ${request.method} ${request.url}`,
      requestId: request.id,
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
