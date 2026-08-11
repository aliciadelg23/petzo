import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { NotFoundError, UnauthorizedError } from '@/shared/errors';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

const wishlistItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  imageUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

const wishlistResponseSchema = z.object({
  id: z.string(),
  items: z.array(wishlistItemSchema),
});

const productIdParamSchema = z.object({
  productId: z.string().min(1).max(200),
});

function requireUser(request: FastifyRequest): string {
  const id = request.currentUser?.sub;
  if (!id) throw new UnauthorizedError('Autenticação necessária.');
  return id;
}

async function loadWishlist(userId: string) {
  const wl = await prisma.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
        },
      },
    },
  });
  return {
    id: wl.id,
    items: wl.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      slug: it.product.slug,
      name: it.product.name,
      price: it.product.price,
      imageUrl: it.product.images[0]?.url ?? null,
      createdAt: it.createdAt.toISOString(),
    })),
  };
}

export async function wishlistRoutes(app: FastifyInstance) {
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/wishlist',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['wishlist'],
        summary: 'Wishlist do usuário (cria vazia se não existir).',
        security: [{ bearerAuth: [] }],
        response: { 200: wishlistResponseSchema, 401: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      return reply.status(200).send(await loadWishlist(userId));
    },
  );

  z2.post(
    '/wishlist/:productId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['wishlist'],
        summary: 'Adiciona produto à wishlist (idempotente).',
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        response: { 200: wishlistResponseSchema, 401: errorSchema, 404: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { productId } = request.params as { productId: string };
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundError('Produto não encontrado.');
      const wl = await prisma.wishlist.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
      await prisma.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId: wl.id, productId } },
        update: {},
        create: { wishlistId: wl.id, productId },
      });
      return reply.status(200).send(await loadWishlist(userId));
    },
  );

  z2.delete(
    '/wishlist/:productId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['wishlist'],
        summary: 'Remove produto da wishlist (idempotente).',
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        response: { 200: wishlistResponseSchema, 401: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { productId } = request.params as { productId: string };
      const wl = await prisma.wishlist.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
      await prisma.wishlistItem
        .delete({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } })
        .catch(() => null);
      return reply.status(200).send(await loadWishlist(userId));
    },
  );
}
