import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import {
  createProductBodySchema,
  listQuerySchema,
  productIdParamSchema,
  productListResponseSchema,
  productResponseSchema,
  updateProductBodySchema,
} from './product.schemas';

const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export async function productRoutes(app: FastifyInstance) {
  const repo = new ProductRepository(prisma);
  const service = new ProductService(repo);
  const controller = new ProductController(service);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  // --------------------- Público (auth opcional: STAFF/ADMIN veem inativos) ---
  z2.get(
    '/products',
    {
      onRequest: [app.optionalAuthenticate],
      schema: {
        tags: ['products'],
        summary: 'Lista produtos com busca, filtros, ordenação e paginação.',
        querystring: listQuerySchema,
        response: {
          200: productListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    controller.list,
  );

  z2.get(
    '/products/:id',
    {
      onRequest: [app.optionalAuthenticate],
      schema: {
        tags: ['products'],
        summary: 'Detalhe de um produto (aceita id ou slug).',
        params: productIdParamSchema,
        response: {
          200: productResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    controller.findOne,
  );

  // --------------------- STAFF/ADMIN ---------------------
  z2.post(
    '/products',
    {
      onRequest: [app.authorize('ADMIN', 'STAFF')],
      schema: {
        tags: ['products'],
        summary: 'Cria um produto (com imagens e inventário iniciais).',
        security: [{ bearerAuth: [] }],
        body: createProductBodySchema,
        response: {
          201: productResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    controller.create,
  );

  z2.patch(
    '/products/:id',
    {
      onRequest: [app.authorize('ADMIN', 'STAFF')],
      schema: {
        tags: ['products'],
        summary: 'Atualiza campos escalares do produto (parcial).',
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        body: updateProductBodySchema,
        response: {
          200: productResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    controller.update,
  );

  z2.delete(
    '/products/:id',
    {
      onRequest: [app.authorize('ADMIN', 'STAFF')],
      schema: {
        tags: ['products'],
        summary: 'Soft-delete: marca active=false (preserva integridade histórica).',
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        response: {
          204: z.void(),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    controller.softDelete,
  );
}
