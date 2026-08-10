import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';

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
        summary: 'Lista categorias (hierárquicas via parentId).',
        response: { 200: categoryListResponseSchema },
      },
    },
    async (_request, reply) => {
      const rows = await prisma.category.findMany({
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, parentId: true, createdAt: true },
      });
      return reply.status(200).send({
        items: rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
      });
    },
  );
}
