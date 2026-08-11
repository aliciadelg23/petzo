import { z } from 'zod';

export const orderStatusEnum = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const addressInputSchema = z.object({
  label: z.string().min(1).max(60),
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(60).optional(),
  district: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  state: z.string().length(2, 'UF deve ter 2 caracteres.').toUpperCase(),
  zip: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido.')
    .transform((v) => v.replace(/(\d{5})-?(\d{3})/, '$1-$2')),
  country: z.string().length(2).default('BR'),
});

export const checkoutBodySchema = z.object({
  address: addressInputSchema,
  couponCode: z.string().trim().min(1).max(60).optional(),
});
export type CheckoutBody = z.infer<typeof checkoutBodySchema>;

export const orderItemResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  slug: z.string(),
  nameSnapshot: z.string(),
  priceSnapshot: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  lineTotal: z.number().int().nonnegative(),
});

export const paymentResponseSchema = z.object({
  id: z.string(),
  provider: z.enum(['STRIPE', 'PIX', 'BOLETO', 'MANUAL']),
  status: z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED']),
  amount: z.number().int().nonnegative(),
  paidAt: z.string().datetime().nullable(),
});

export const orderResponseSchema = z.object({
  id: z.string(),
  status: orderStatusEnum,
  subtotal: z.number().int().nonnegative(),
  shipping: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  addressSnapshot: addressInputSchema.extend({ complement: z.string().nullable().optional() }),
  couponCode: z.string().nullable(),
  items: z.array(orderItemResponseSchema),
  payment: paymentResponseSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;

export const orderListResponseSchema = z.object({
  items: z.array(orderResponseSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const orderIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});
