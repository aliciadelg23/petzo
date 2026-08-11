import { z } from 'zod';

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

export const orderStatusEnum = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const dashboardMetricsSchema = z.object({
  sales: z.object({
    /** Total em centavos (soma de todos os pedidos pagos ou além). */
    total: z.number().int().nonnegative(),
    /** Contagem de pedidos pagos ou além. */
    count: z.number().int().nonnegative(),
    /** Ticket médio em centavos. 0 quando count=0. */
    avgTicket: z.number().int().nonnegative(),
    /** Série diária dos últimos 30 dias (revenue em centavos + count). */
    series: z.array(
      z.object({
        date: z.string(), // ISO date YYYY-MM-DD
        revenue: z.number().int().nonnegative(),
        orders: z.number().int().nonnegative(),
      }),
    ),
  }),
  orders: z.object({
    total: z.number().int().nonnegative(),
    byStatus: z.record(orderStatusEnum, z.number().int().nonnegative()),
    /** Pedidos que ainda precisam de ação operacional (PAID/PROCESSING/SHIPPED). */
    pending: z.number().int().nonnegative(),
  }),
  customers: z.object({
    total: z.number().int().nonnegative(),
    newLast30d: z.number().int().nonnegative(),
  }),
  products: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    /** Produtos com inventory.quantity abaixo do inventory.reorderPoint. */
    lowStock: z.array(
      z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        quantity: z.number().int().nonnegative(),
        reorderPoint: z.number().int().nonnegative(),
      }),
    ),
  }),
});
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

// ---------------------------------------------------------------------------
// Admin orders
// ---------------------------------------------------------------------------

export const adminOrderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: orderStatusEnum.optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const adminOrderListItemSchema = z.object({
  id: z.string(),
  status: orderStatusEnum,
  total: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  itemCount: z.number().int().nonnegative(),
  customer: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});

export const adminOrderListResponseSchema = z.object({
  items: z.array(adminOrderListItemSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const orderStatusTransitionBodySchema = z.object({
  status: orderStatusEnum,
});
export type OrderStatusTransitionBody = z.infer<typeof orderStatusTransitionBodySchema>;

// ---------------------------------------------------------------------------
// Admin customers
// ---------------------------------------------------------------------------

export const adminCustomerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});

export const adminCustomerSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
  emailVerifiedAt: z.string().datetime().nullable(),
  ordersCount: z.number().int().nonnegative(),
  totalSpent: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const adminCustomerListResponseSchema = z.object({
  items: z.array(adminCustomerSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// Admin inventory
// ---------------------------------------------------------------------------

export const adminInventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  lowStock: z.union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
});

export const adminInventoryItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  active: z.boolean(),
  quantity: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  reorderPoint: z.number().int().nonnegative(),
  price: z.number().int().nonnegative(),
});

export const adminInventoryListResponseSchema = z.object({
  items: z.array(adminInventoryItemSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const updateInventoryBodySchema = z.object({
  quantity: z.number().int().nonnegative().max(1_000_000).optional(),
  reorderPoint: z.number().int().nonnegative().max(1_000_000).optional(),
});

export const productIdParamSchema = z.object({
  productId: z.string().min(1).max(200),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1).max(200),
});
