import type { PrismaClient } from '@prisma/client';
import type { DashboardMetrics } from './admin.schemas';

/**
 * Agregação de métricas do painel administrativo.
 *
 * Toda métrica vem do banco — nenhum valor é hardcoded. Consultas usam
 * `groupBy`/`count`/`aggregate` do Prisma para evitar carregar dados
 * pesados no processo.
 *
 * Períodos:
 *  - "sales" considera pedidos em PAID/PROCESSING/SHIPPED/DELIVERED (i.e., já
 *    representam receita real; PENDING_PAYMENT e CANCELLED ficam de fora).
 *  - "novos clientes" = usuários com `role=CUSTOMER` criados nos últimos 30 dias.
 *  - Série de vendas cobre os últimos 30 dias (inclusive hoje).
 */
export class MetricsService {
  constructor(private readonly prisma: PrismaClient) {}

  private readonly REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
  private readonly PENDING_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED'] as const;

  async build(): Promise<DashboardMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29); // últimos 30 dias inclusive

    const [
      salesAgg,
      salesSeriesRows,
      ordersTotal,
      ordersByStatusRaw,
      customerRole,
      customersTotal,
      customersNew,
      productsTotal,
      productsActive,
      lowStockRaw,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: { _all: true },
        where: { status: { in: this.REVENUE_STATUSES as unknown as string[] as never } as never },
      }),
      this.prisma.$queryRaw<{ day: Date; revenue: bigint | null; orders: bigint }[]>`
        SELECT
          date_trunc('day', "createdAt") AS day,
          SUM("total")::bigint AS revenue,
          COUNT(*)::bigint AS orders
        FROM "Order"
        WHERE "status" IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
          AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: { name: 'CUSTOMER' } } }),
      this.prisma.user.count({
        where: {
          role: { name: 'CUSTOMER' },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { active: true } }),
      // "estoque baixo" = quantity < reorderPoint. Comparar duas colunas requer raw.
      this.prisma.$queryRaw<
        { id: string; slug: string; name: string; quantity: number; reorderPoint: number }[]
      >`
        SELECT p.id, p.slug, p.name, i.quantity, i."reorderPoint"
        FROM "Product" p
        JOIN "Inventory" i ON i."productId" = p.id
        WHERE p.active = TRUE AND i.quantity < i."reorderPoint"
        ORDER BY (i."reorderPoint" - i.quantity) DESC
        LIMIT 20
      `,
    ]);

    void customerRole; // usado só para garantir que a role exista via NoRowFound

    // salesAgg
    const salesTotal = salesAgg._sum.total ?? 0;
    const salesCount = salesAgg._count._all;
    const avgTicket = salesCount > 0 ? Math.floor(salesTotal / salesCount) : 0;

    // série 30d — precisamos preencher dias vazios com 0
    const seriesMap = new Map<string, { revenue: number; orders: number }>();
    for (const row of salesSeriesRows) {
      const key = row.day.toISOString().slice(0, 10);
      seriesMap.set(key, {
        revenue: Number(row.revenue ?? 0n),
        orders: Number(row.orders),
      });
    }
    const series: DashboardMetrics['sales']['series'] = [];
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(thirtyDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const found = seriesMap.get(key);
      series.push({
        date: key,
        revenue: found?.revenue ?? 0,
        orders: found?.orders ?? 0,
      });
    }

    // orders by status: preencher zeros nos ausentes
    const byStatus: DashboardMetrics['orders']['byStatus'] = {
      PENDING_PAYMENT: 0,
      PAID: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const row of ordersByStatusRaw) {
      byStatus[row.status as keyof typeof byStatus] = row._count._all;
    }
    const pending = this.PENDING_STATUSES.reduce(
      (acc, s) => acc + (byStatus[s] ?? 0),
      0,
    );

    return {
      sales: { total: salesTotal, count: salesCount, avgTicket, series },
      orders: { total: ordersTotal, byStatus, pending },
      customers: { total: customersTotal, newLast30d: customersNew },
      products: {
        total: productsTotal,
        active: productsActive,
        lowStock: lowStockRaw.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          quantity: r.quantity,
          reorderPoint: r.reorderPoint,
        })),
      },
    };
  }
}
