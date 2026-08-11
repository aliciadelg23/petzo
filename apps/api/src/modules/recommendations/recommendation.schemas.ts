import { z } from 'zod';

export const petIdParamSchema = z.object({
  petId: z.string().min(1).max(200),
});

export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;

const relatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const recommendationItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  imageUrl: z.string().url().nullable(),
  category: relatedSchema,
  brand: relatedSchema,
  score: z.number().nonnegative(),
  reasons: z.array(z.string()),
});

export const recommendationResultSchema = z.object({
  petId: z.string(),
  strategy: z.string(),
  disclaimer: z.string(),
  items: z.array(recommendationItemSchema),
});
