import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import {
  addItemBodySchema,
  cartResponseSchema,
  itemIdParamSchema,
  updateItemBodySchema,
} from './cart.schemas';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export async function cartRoutes(app: FastifyInstance) {
  const repo = new CartRepository(prisma);
  const service = new CartService(repo);
  const controller = new CartController(service);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/cart',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['cart'],
        summary: 'Retorna o carrinho do usuário (cria vazio se não existir).',
        security: [{ bearerAuth: [] }],
        response: { 200: cartResponseSchema, 401: errorSchema },
      },
    },
    controller.getMyCart,
  );

  z2.post(
    '/cart/items',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['cart'],
        summary: 'Adiciona (ou incrementa quantidade de) um item no carrinho.',
        security: [{ bearerAuth: [] }],
        body: addItemBodySchema,
        response: {
          201: cartResponseSchema,
          400: errorSchema,
          401: errorSchema,
          409: errorSchema,
        },
      },
    },
    controller.addItem,
  );

  z2.patch(
    '/cart/items/:itemId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['cart'],
        summary: 'Atualiza a quantidade de um item.',
        security: [{ bearerAuth: [] }],
        params: itemIdParamSchema,
        body: updateItemBodySchema,
        response: {
          200: cartResponseSchema,
          401: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    controller.updateItem,
  );

  z2.delete(
    '/cart/items/:itemId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['cart'],
        summary: 'Remove um item do carrinho.',
        security: [{ bearerAuth: [] }],
        params: itemIdParamSchema,
        response: { 200: cartResponseSchema, 401: errorSchema, 404: errorSchema },
      },
    },
    controller.removeItem,
  );

  z2.delete(
    '/cart',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['cart'],
        summary: 'Esvazia o carrinho.',
        security: [{ bearerAuth: [] }],
        response: { 200: cartResponseSchema, 401: errorSchema },
      },
    },
    controller.clearCart,
  );
}
