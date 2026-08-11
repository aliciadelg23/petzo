import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { readThrough, TAG, TTL } from '@/shared/cache';

const brandResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

const brandListResponseSchema = z.object({
  items: z.array(brandResponseSchema),
});

export async function brandRoutes(app: FastifyInstance) {
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/brands',
    {
      schema: {
        tags: ['brands'],
        summary: 'Lista marcas em ordem alfabética. Cache 300s.',
        response: { 200: brandListResponseSchema },
      },
    },
    async (_request, reply) => {
      const result = await readThrough(
        app.cache,
        'catalog:brands:list',
        TTL.BRANDS,
        [TAG.CATALOG_BRANDS],
        async () => {
          const rows = await prisma.brand.findMany({
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              createdAt: true,
            },
          });
          return {
            items: rows.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
          };
        },
      );
      return reply.status(200).send(result);
    },
  );
}
