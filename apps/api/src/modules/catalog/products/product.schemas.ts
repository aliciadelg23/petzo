import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shapes de resposta (públicos)
// ---------------------------------------------------------------------------

export const productImageResponseSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  position: z.number().int().nonnegative(),
});

export const productRelatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const productResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  /** Preço em centavos (BRL). */
  price: z.number().int().nonnegative(),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'REPTILE', 'RODENT', 'OTHER']),
  active: z.boolean(),
  available: z.boolean(),
  category: productRelatedSchema,
  brand: productRelatedSchema,
  images: z.array(productImageResponseSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProductResponse = z.infer<typeof productResponseSchema>;

export const productListResponseSchema = z.object({
  items: z.array(productResponseSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// Query params (validados com coerce.number pois query string sempre chega string)
// ---------------------------------------------------------------------------

export const sortEnum = z.enum([
  'price_asc',
  'price_desc',
  'newest',
  'oldest',
  'name_asc',
  'name_desc',
]);
export type Sort = z.infer<typeof sortEnum>;

const priceCents = z.coerce.number().int().nonnegative().max(100_000_00);
const booleanQuery = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  brand: z.string().trim().min(1).max(120).optional(),
  species: z
    .enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'REPTILE', 'RODENT', 'OTHER'])
    .optional(),
  minPrice: priceCents.optional(),
  maxPrice: priceCents.optional(),
  available: booleanQuery.optional(),
  sort: sortEnum.default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export const productIdParamSchema = z.object({
  /** Aceita cuid OU slug — reduz atrito para clients que só têm um dos dois. */
  id: z.string().min(1).max(200),
});
export type ProductIdParam = z.infer<typeof productIdParamSchema>;

// ---------------------------------------------------------------------------
// Bodies (mutações)
// ---------------------------------------------------------------------------

const imageInputSchema = z.object({
  url: z.string().url(),
  alt: z.string().min(1).max(200),
  position: z.number().int().nonnegative().max(1000).default(0),
});

const inventoryInputSchema = z.object({
  quantity: z.number().int().nonnegative().default(0),
  reorderPoint: z.number().int().nonnegative().default(10),
});

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  /** Se ausente, gerado a partir do name. */
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug deve ser kebab-case (a-z, 0-9, hífen).')
    .max(200)
    .optional(),
  description: z.string().min(1).max(5000),
  categoryId: z.string().min(1).max(200),
  brandId: z.string().min(1).max(200),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'REPTILE', 'RODENT', 'OTHER']),
  price: priceCents,
  active: z.boolean().default(true),
  images: z.array(imageInputSchema).max(20).default([]),
  inventory: inventoryInputSchema.default({ quantity: 0, reorderPoint: 10 }),
});
export type CreateProductBody = z.infer<typeof createProductBodySchema>;

// Sem .refine() aqui: o type provider Zod não extrai forma de ZodEffects.
// A regra "ao menos um campo" vive no service (ProductService.update).
export const updateProductBodySchema = createProductBodySchema
  .partial()
  .omit({ images: true, inventory: true });
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
