import { z } from 'zod';

export const speciesEnum = z.enum([
  'DOG',
  'CAT',
  'BIRD',
  'RABBIT',
  'FISH',
  'REPTILE',
  'RODENT',
  'OTHER',
]);

export const petResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: speciesEnum,
  breed: z.string().nullable(),
  birthDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const petListResponseSchema = z.object({
  items: z.array(petResponseSchema),
});

export const createPetBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  species: speciesEnum,
  breed: z.string().trim().min(1).max(80).optional(),
  birthDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
});
export type CreatePetBody = z.infer<typeof createPetBodySchema>;

export const updatePetBodySchema = createPetBodySchema.partial();
export type UpdatePetBody = z.infer<typeof updatePetBodySchema>;

export const petIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});
