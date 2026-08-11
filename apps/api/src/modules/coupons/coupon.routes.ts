import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { CouponService } from './coupon.service';
import {
  couponIdParamSchema,
  couponListResponseSchema,
  couponResponseSchema,
  createCouponBodySchema,
  updateCouponBodySchema,
  validateCouponBodySchema,
  validateCouponResponseSchema,
  type CreateCouponBody,
  type UpdateCouponBody,
  type ValidateCouponBody,
} from './coupon.schemas';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

export async function couponRoutes(app: FastifyInstance) {
  const service = new CouponService(prisma);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  // Validate: qualquer usuário autenticado — usado antes do checkout
  z2.post(
    '/coupons/validate',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['coupons'],
        summary: 'Valida cupom + subtotal e devolve desconto (mesma regra do checkout).',
        security: [{ bearerAuth: [] }],
        body: validateCouponBodySchema,
        response: { 200: validateCouponResponseSchema, 401: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as ValidateCouponBody;
      return reply.status(200).send(await service.validate(body));
    },
  );

  // Admin CRUD — STAFF/ADMIN
  const gate = { onRequest: [app.authorize('ADMIN', 'STAFF')] };

  z2.get(
    '/coupons',
    {
      ...gate,
      schema: {
        tags: ['coupons'],
        summary: 'Lista cupons (STAFF/ADMIN).',
        security: [{ bearerAuth: [] }],
        response: { 200: couponListResponseSchema, 401: errorSchema, 403: errorSchema },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send(await service.list());
    },
  );

  z2.post(
    '/coupons',
    {
      ...gate,
      schema: {
        tags: ['coupons'],
        summary: 'Cria cupom (STAFF/ADMIN).',
        security: [{ bearerAuth: [] }],
        body: createCouponBodySchema,
        response: {
          201: couponResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as CreateCouponBody;
      const created = await service.create(body);
      return reply.status(201).send(created);
    },
  );

  z2.patch(
    '/coupons/:id',
    {
      ...gate,
      schema: {
        tags: ['coupons'],
        summary: 'Atualiza cupom (STAFF/ADMIN).',
        security: [{ bearerAuth: [] }],
        params: couponIdParamSchema,
        body: updateCouponBodySchema,
        response: {
          200: couponResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateCouponBody;
      const updated = await service.update(id, body);
      return reply.status(200).send(updated);
    },
  );

  z2.delete(
    '/coupons/:id',
    {
      ...gate,
      schema: {
        tags: ['coupons'],
        summary: 'Soft-delete de cupom (active=false). Preserva histórico.',
        security: [{ bearerAuth: [] }],
        params: couponIdParamSchema,
        response: { 204: z.void(), 401: errorSchema, 403: errorSchema, 404: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      await service.remove(id);
      return reply.status(204).send();
    },
  );
}
