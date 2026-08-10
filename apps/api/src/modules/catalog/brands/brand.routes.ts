import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';

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
        summary: 'Lista marcas em ordem alfabética.',
        response: { 200: brandListResponseSchema },
      },
    },
    async (_request, reply) => {
      const rows = await prisma.brand.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, logoUrl: true, createdAt: true },
      });
      return reply.status(200).send({
        items: rows.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
      });
    },
  );
}
