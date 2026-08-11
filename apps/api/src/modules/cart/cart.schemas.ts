import { z } from 'zod';

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export const cartItemResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  imageUrl: z.string().url().nullable(),
  /** Preço unitário atual do produto em centavos — recalculado pelo backend. */
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  /** unitPrice × quantity, servido pelo backend para o front não recomputar. */
  lineTotal: z.number().int().nonnegative(),
  /** Estoque disponível AGORA — usado para desabilitar +qtd na UI. */
  availableStock: z.number().int().nonnegative(),
});

export const cartResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(cartItemResponseSchema),
  subtotal: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export type CartResponse = z.infer<typeof cartResponseSchema>;

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export const addItemBodySchema = z.object({
  productId: z.string().min(1).max(200),
  quantity: z.number().int().positive().max(999),
});

export const updateItemBodySchema = z.object({
  quantity: z.number().int().positive().max(999),
});

export const itemIdParamSchema = z.object({
  itemId: z.string().min(1).max(200),
});
