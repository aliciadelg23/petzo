import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { UnauthorizedError } from '@/shared/errors';
import { SubscriptionService } from './subscription.service';
import {
  createSubscriptionBodySchema,
  statusTransitionBodySchema,
  subscriptionIdParamSchema,
  subscriptionListResponseSchema,
  subscriptionResponseSchema,
  type CreateSubscriptionBody,
  type StatusTransitionBody,
} from './subscription.schemas';

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

export async function subscriptionRoutes(app: FastifyInstance) {
  const service = new SubscriptionService(prisma);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/subscriptions',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subscriptions'],
        summary: 'Lista assinaturas do usuário autenticado.',
        security: [{ bearerAuth: [] }],
        response: { 200: subscriptionListResponseSchema, 401: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      return reply.status(200).send(await service.listMine(userId));
    },
  );

  z2.post(
    '/subscriptions',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subscriptions'],
        summary: 'Cria nova assinatura ACTIVE para o produto informado.',
        security: [{ bearerAuth: [] }],
        body: createSubscriptionBodySchema,
        response: {
          201: subscriptionResponseSchema,
          400: errorSchema,
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const body = request.body as CreateSubscriptionBody;
      const created = await service.create(userId, body);
      return reply.status(201).send(created);
    },
  );

  z2.patch(
    '/subscriptions/:id/status',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['subscriptions'],
        summary: 'Transita status (respeita state machine).',
        security: [{ bearerAuth: [] }],
        params: subscriptionIdParamSchema,
        body: statusTransitionBodySchema,
        response: {
          200: subscriptionResponseSchema,
          400: errorSchema,
          401: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { id } = request.params as { id: string };
      const { status } = request.body as StatusTransitionBody;
      const updated = await service.transitionStatus(userId, id, status);
      return reply.status(200).send(updated);
    },
  );
}
