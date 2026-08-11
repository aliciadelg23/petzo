import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { readThrough, TAG, TTL } from '@/shared/cache';

const categoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const categoryListResponseSchema = z.object({
  items: z.array(categoryResponseSchema),
});

export async function categoryRoutes(app: FastifyInstance) {
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/categories',
    {
      schema: {
        tags: ['categories'],
        summary: 'Lista categorias (hierárquicas via parentId). Cache 300s.',
        response: { 200: categoryListResponseSchema },
      },
    },
    async (_request, reply) => {
      const result = await readThrough(
        app.cache,
        'catalog:cats:list',
        TTL.CATEGORIES,
        [TAG.CATALOG_CATEGORIES],
        async () => {
          const rows = await prisma.category.findMany({
            orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              createdAt: true,
            },
          });
          return {
            items: rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
          };
        },
      );
      return reply.status(200).send(result);
    },
  );
}
