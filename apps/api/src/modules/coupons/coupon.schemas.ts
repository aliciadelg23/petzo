import { z } from 'zod';

export const couponResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  discountPercent: z.number().int().nullable(),
  discountAmount: z.number().int().nullable(),
  minOrderAmount: z.number().int().nullable(),
  maxUses: z.number().int().nullable(),
  usedCount: z.number().int().nonnegative(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});

export const couponListResponseSchema = z.object({
  items: z.array(couponResponseSchema),
});

/**
 * Regra: um cupom é ou percentual OU valor fixo — nunca ambos, nunca nenhum.
 */
export const createCouponBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(/^[A-Z0-9_-]+$/, 'Code em MAIÚSCULAS, dígitos, _ ou -'),
    description: z.string().max(200).optional(),
    discountPercent: z.number().int().min(1).max(100).optional(),
    discountAmount: z.number().int().positive().max(1_000_000_00).optional(),
    minOrderAmount: z.number().int().nonnegative().max(1_000_000_00).optional(),
    maxUses: z.number().int().positive().max(1_000_000).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const hasPct = data.discountPercent != null;
    const hasAmt = data.discountAmount != null;
    if (hasPct === hasAmt) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe discountPercent OU discountAmount (exatamente um).',
      });
    }
    if (data.startsAt && data.endsAt && new Date(data.startsAt) >= new Date(data.endsAt)) {
      ctx.addIssue({ code: 'custom', message: 'startsAt deve ser antes de endsAt.' });
    }
  });
export type CreateCouponBody = z.infer<typeof createCouponBodySchema>;

// Update: sem regra cruzada (deixa o service decidir); todos opcionais.
export const updateCouponBodySchema = z.object({
  description: z.string().max(200).optional(),
  discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  discountAmount: z.number().int().positive().max(1_000_000_00).nullable().optional(),
  minOrderAmount: z.number().int().nonnegative().max(1_000_000_00).nullable().optional(),
  maxUses: z.number().int().positive().max(1_000_000).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
});
export type UpdateCouponBody = z.infer<typeof updateCouponBodySchema>;

export const validateCouponBodySchema = z.object({
  code: z.string().trim().min(1).max(60),
  subtotal: z.number().int().nonnegative().max(1_000_000_00),
});
export type ValidateCouponBody = z.infer<typeof validateCouponBodySchema>;

export const validateCouponResponseSchema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable(),
  discount: z.number().int().nonnegative(),
  code: z.string().nullable(),
});

export const couponIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});
