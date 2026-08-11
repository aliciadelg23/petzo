import { z } from 'zod';

export const reviewResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  userId: z.string(),
  userName: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const reviewListResponseSchema = z.object({
  items: z.array(reviewResponseSchema),
  averageRating: z.number().nullable(),
  count: z.number().int().nonnegative(),
});

export const createReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(2000).optional(),
});
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

export const updateReviewBodySchema = createReviewBodySchema.partial();
export type UpdateReviewBody = z.infer<typeof updateReviewBodySchema>;

export const productIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});
