import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { UnauthorizedError } from '@/shared/errors';
import { ReviewService } from './review.service';
import {
  createReviewBodySchema,
  productIdParamSchema,
  reviewIdParamSchema,
  reviewListResponseSchema,
  reviewResponseSchema,
  updateReviewBodySchema,
  type CreateReviewBody,
  type UpdateReviewBody,
} from './review.schemas';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

function requireUser(request: FastifyRequest): string {
  const id = request.currentUser?.sub;
  if (!id) throw new UnauthorizedError('Autenticação necessária.');
  return id;
}

export async function reviewRoutes(app: FastifyInstance) {
  const service = new ReviewService(prisma);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/products/:id/reviews',
    {
      schema: {
        tags: ['reviews'],
        summary: 'Lista reviews de um produto (público).',
        params: productIdParamSchema,
        response: { 200: reviewListResponseSchema, 404: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      return reply.status(200).send(await service.listByProduct(id));
    },
  );

  z2.post(
    '/products/:id/reviews',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['reviews'],
        summary: 'Cria review — SÓ quem comprou o produto pode avaliar.',
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        body: createReviewBodySchema,
        response: {
          201: reviewResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { id } = request.params as { id: string };
      const body = request.body as CreateReviewBody;
      const created = await service.create(userId, id, body);
      return reply.status(201).send(created);
    },
  );

  z2.patch(
    '/reviews/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['reviews'],
        summary: 'Atualiza review (owner-only).',
        security: [{ bearerAuth: [] }],
        params: reviewIdParamSchema,
        body: updateReviewBodySchema,
        response: {
          200: reviewResponseSchema,
          401: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdateReviewBody;
      const updated = await service.update(userId, id, body);
      return reply.status(200).send(updated);
    },
  );

  z2.delete(
    '/reviews/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['reviews'],
        summary: 'Remove review (owner-only).',
        security: [{ bearerAuth: [] }],
        params: reviewIdParamSchema,
        response: { 204: z.void(), 401: errorSchema, 404: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { id } = request.params as { id: string };
      await service.remove(userId, id);
      return reply.status(204).send();
    },
  );
}
