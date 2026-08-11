import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { MetricsService } from './metrics.service';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import {
  adminCustomerListQuerySchema,
  adminCustomerListResponseSchema,
  adminInventoryListResponseSchema,
  adminInventoryQuerySchema,
  adminOrderListQuerySchema,
  adminOrderListResponseSchema,
  dashboardMetricsSchema,
  orderIdParamSchema,
  orderStatusTransitionBodySchema,
  productIdParamSchema,
  updateInventoryBodySchema,
} from './admin.schemas';

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  const metricsService = new MetricsService(prisma);
  const adminService = new AdminService(prisma);
  const controller = new AdminController(metricsService, adminService);
  const z2 = app.withTypeProvider<ZodTypeProvider>();

  // Todos os endpoints exigem STAFF ou ADMIN
  const gate = { onRequest: [app.authorize('ADMIN', 'STAFF')] };

  z2.get(
    '/admin/dashboard/metrics',
    {
      ...gate,
      schema: {
        tags: ['admin'],
        summary: 'Métricas agregadas do dashboard (vendas, pedidos, clientes, estoque baixo).',
        security: [{ bearerAuth: [] }],
        response: {
          200: dashboardMetricsSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    controller.getMetrics,
  );

  z2.get(
    '/admin/orders',
    {
      ...gate,
      schema: {
        tags: ['admin'],
        summary: 'Lista todos os pedidos (paginado, filtrável por status).',
        security: [{ bearerAuth: [] }],
        querystring: adminOrderListQuerySchema,
        response: {
          200: adminOrderListResponseSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    controller.listOrders,
  );

  z2.patch(
    '/admin/orders/:id/status',
    {
      ...gate,
      schema: {
        tags: ['admin'],
        summary: 'Transição de status do pedido (respeita a state machine).',
        security: [{ bearerAuth: [] }],
        params: orderIdParamSchema,
        body: orderStatusTransitionBodySchema,
        response: {
          200: z.object({ id: z.string(), status: z.string() }),
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    controller.transitionOrderStatus,
  );

  z2.get(
    '/admin/customers',
    {
      ...gate,
      schema: {
        tags: ['admin'],
        summary: 'Lista clientes com estatísticas (nº de pedidos + total gasto).',
        security: [{ bearerAuth: [] }],
        querystring: adminCustomerListQuerySchema,
        response: {
          200: adminCustomerListResponseSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    controller.listCustomers,
  );

  z2.get(
    '/admin/inventory',
    {
      ...gate,
      schema: {
        tags: ['admin'],
        summary: 'Lista produtos com posição de estoque; filtro opcional por lowStock.',
        security: [{ bearerAuth: [] }],
        querystring: adminInventoryQuerySchema,
        response: {
          200: adminInventoryListResponseSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    controller.listInventory,
  );

  z2.patch(
    '/admin/inventory/:productId',
    {
      ...gate,
      schema: {
        tags: ['admin'],
        summary: 'Atualiza quantidade e/ou reorderPoint do estoque de um produto.',
        security: [{ bearerAuth: [] }],
        params: productIdParamSchema,
        body: updateInventoryBodySchema,
        response: {
          200: z.object({
            productId: z.string(),
            quantity: z.number().int().nonnegative(),
            reserved: z.number().int().nonnegative(),
            reorderPoint: z.number().int().nonnegative(),
          }),
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    controller.updateInventory,
  );
}
