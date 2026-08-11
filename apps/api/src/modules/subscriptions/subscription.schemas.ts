import { z } from 'zod';

export const frequencyEnum = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']);
export const subscriptionStatusEnum = z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']);

export const subscriptionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  productPrice: z.number().int().nonnegative(),
  frequency: frequencyEnum,
  status: subscriptionStatusEnum,
  nextChargeAt: z.string().datetime().nullable(),
  canceledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const subscriptionListResponseSchema = z.object({
  items: z.array(subscriptionResponseSchema),
});

export const createSubscriptionBodySchema = z.object({
  productId: z.string().min(1).max(200),
  frequency: frequencyEnum,
});
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;

export const statusTransitionBodySchema = z.object({
  status: subscriptionStatusEnum,
});
export type StatusTransitionBody = z.infer<typeof statusTransitionBodySchema>;

export const subscriptionIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});
