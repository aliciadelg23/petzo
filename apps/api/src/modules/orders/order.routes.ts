import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import {
  checkoutBodySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  orderListResponseSchema,
  orderResponseSchema,
} from './order.schemas';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export async function orderRoutes(app: FastifyInstance) {
  const repo = new OrderRepository(prisma);
  const service = new OrderService(repo);
  const controller = new OrderController(service);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.post(
    '/orders',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['orders'],
        summary:
          'Checkout: consome o carrinho do usuário, calcula preços no servidor e cria o pedido.',
        security: [{ bearerAuth: [] }],
        body: checkoutBodySchema,
        response: {
          201: orderResponseSchema,
          400: errorSchema,
          401: errorSchema,
          409: errorSchema,
        },
      },
    },
    controller.checkout,
  );

  z2.get(
    '/orders',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['orders'],
        summary: 'Lista os pedidos do usuário autenticado (paginado).',
        security: [{ bearerAuth: [] }],
        querystring: listOrdersQuerySchema,
        response: { 200: orderListResponseSchema, 401: errorSchema },
      },
    },
    controller.list,
  );

  z2.get(
    '/orders/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['orders'],
        summary: 'Detalhe de um pedido (do usuário autenticado).',
        security: [{ bearerAuth: [] }],
        params: orderIdParamSchema,
        response: {
          200: orderResponseSchema,
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    controller.findOne,
  );
}
