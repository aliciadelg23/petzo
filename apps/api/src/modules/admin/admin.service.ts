import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/shared/errors';
import { assertTransition } from '../orders/order.state-machine';

/**
 * Facade dos casos de uso administrativos (fora do dashboard):
 * orders (listar todos + transição), customers (listar), inventory (listar + atualizar).
 */
export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  async listOrders(input: {
    page: number;
    limit: number;
    status?:
      | 'PENDING_PAYMENT'
      | 'PAID'
      | 'PROCESSING'
      | 'SHIPPED'
      | 'DELIVERED'
      | 'CANCELLED';
  }) {
    const where = input.status ? { status: input.status } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
        itemCount: o._count.items,
        customer: o.user,
      })),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    };
  }

  async transitionOrderStatus(orderId: string, target: 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED') {
    const current = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!current) throw new NotFoundError('Pedido não encontrado.');
    assertTransition(current.status, target);
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: target },
      select: { id: true, status: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async listCustomers(input: { page: number; limit: number; search?: string }) {
    const where = {
      role: { name: 'CUSTOMER' as const },
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: { select: { name: true } },
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Agrega ordens/gasto por usuário (uma consulta única para todos)
    const stats = await this.prisma.order.groupBy({
      by: ['userId'],
      _count: { _all: true },
      _sum: { total: true },
      where: {
        userId: { in: rows.map((r) => r.id) },
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
    });
    const statsById = new Map(
      stats.map((s) => [s.userId, { count: s._count._all, sum: s._sum.total ?? 0 }]),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role.name,
        emailVerifiedAt: r.emailVerifiedAt?.toISOString() ?? null,
        ordersCount: statsById.get(r.id)?.count ?? 0,
        totalSpent: statsById.get(r.id)?.sum ?? 0,
        createdAt: r.createdAt.toISOString(),
      })),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    };
  }

  // ---------------------------------------------------------------------------
  // Inventory
  // ---------------------------------------------------------------------------

  async listInventory(input: { page: number; limit: number; lowStock?: boolean }) {
    // low-stock filter precisa raw (comparar duas colunas)
    if (input.lowStock === true) {
      const items = await this.prisma.$queryRaw<
        {
          productId: string;
          slug: string;
          name: string;
          active: boolean;
          quantity: number;
          reserved: number;
          reorderPoint: number;
          price: number;
        }[]
      >`
        SELECT
          p.id AS "productId", p.slug, p.name, p.active, p.price,
          i.quantity, i.reserved, i."reorderPoint"
        FROM "Product" p
        JOIN "Inventory" i ON i."productId" = p.id
        WHERE i.quantity < i."reorderPoint"
        ORDER BY (i."reorderPoint" - i.quantity) DESC
        LIMIT ${input.limit}
        OFFSET ${(input.page - 1) * input.limit}
      `;
      const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Product" p JOIN "Inventory" i ON i."productId" = p.id
        WHERE i.quantity < i."reorderPoint"
      `;
      const total = Number(countRows[0]?.count ?? 0);
      return {
        items,
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        orderBy: { name: 'asc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        select: {
          id: true,
          slug: true,
          name: true,
          active: true,
          price: true,
          inventory: {
            select: { quantity: true, reserved: true, reorderPoint: true },
          },
        },
      }),
      this.prisma.product.count(),
    ]);
    return {
      items: rows.map((p) => ({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        active: p.active,
        quantity: p.inventory?.quantity ?? 0,
        reserved: p.inventory?.reserved ?? 0,
        reorderPoint: p.inventory?.reorderPoint ?? 0,
        price: p.price,
      })),
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    };
  }

  async updateInventory(productId: string, patch: { quantity?: number; reorderPoint?: number }) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });
    if (!product) throw new NotFoundError('Produto não encontrado.');

    if (!product.inventory) {
      const created = await this.prisma.inventory.create({
        data: {
          productId,
          quantity: patch.quantity ?? 0,
          reorderPoint: patch.reorderPoint ?? 10,
        },
      });
      return created;
    }
    return this.prisma.inventory.update({
      where: { productId },
      data: {
        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
        ...(patch.reorderPoint !== undefined ? { reorderPoint: patch.reorderPoint } : {}),
      },
    });
  }
}
