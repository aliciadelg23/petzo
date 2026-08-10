import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { NotFoundError, UnauthorizedError } from '@/shared/errors';
import {
  createPetBodySchema,
  petIdParamSchema,
  petListResponseSchema,
  petResponseSchema,
  updatePetBodySchema,
  type CreatePetBody,
  type UpdatePetBody,
} from './pet.schemas';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

function toResponse(p: {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    birthDate: p.birthDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function requireUser(request: FastifyRequest): string {
  const id = request.currentUser?.sub;
  if (!id) throw new UnauthorizedError('Autenticação necessária.');
  return id;
}

export async function petRoutes(app: FastifyInstance) {
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  z2.get(
    '/pets',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Lista os pets do usuário autenticado.',
        security: [{ bearerAuth: [] }],
        response: { 200: petListResponseSchema, 401: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const items = await prisma.pet.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      return reply.status(200).send({ items: items.map(toResponse) });
    },
  );

  z2.post(
    '/pets',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Cria um pet do usuário autenticado.',
        security: [{ bearerAuth: [] }],
        body: createPetBodySchema,
        response: {
          201: petResponseSchema,
          401: errorSchema,
          400: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const body = request.body as CreatePetBody;
      const created = await prisma.pet.create({
        data: {
          userId,
          name: body.name,
          species: body.species,
          breed: body.breed,
          birthDate: body.birthDate ? new Date(body.birthDate) : null,
        },
      });
      return reply.status(201).send(toResponse(created));
    },
  );

  z2.patch(
    '/pets/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Atualiza um pet (owner-only).',
        security: [{ bearerAuth: [] }],
        params: petIdParamSchema,
        body: updatePetBodySchema,
        response: {
          200: petResponseSchema,
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { id } = request.params as { id: string };
      const body = request.body as UpdatePetBody;
      const existing = await prisma.pet.findUnique({ where: { id } });
      // Retorna 404 (não 403) para não vazar existência
      if (!existing || existing.userId !== userId) throw new NotFoundError('Pet não encontrado.');
      const updated = await prisma.pet.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.species !== undefined ? { species: body.species } : {}),
          ...(body.breed !== undefined ? { breed: body.breed } : {}),
          ...(body.birthDate !== undefined
            ? { birthDate: body.birthDate ? new Date(body.birthDate) : null }
            : {}),
        },
      });
      return reply.status(200).send(toResponse(updated));
    },
  );

  z2.delete(
    '/pets/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['pets'],
        summary: 'Remove um pet (owner-only).',
        security: [{ bearerAuth: [] }],
        params: petIdParamSchema,
        response: { 204: z.void(), 401: errorSchema, 404: errorSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireUser(request);
      const { id } = request.params as { id: string };
      const existing = await prisma.pet.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) throw new NotFoundError('Pet não encontrado.');
      await prisma.pet.delete({ where: { id } });
      return reply.status(204).send();
    },
  );
}
