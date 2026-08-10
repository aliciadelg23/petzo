import type { PrismaClient, Prisma } from '@prisma/client';

const ORDER_INCLUDE = {
  items: {
    orderBy: { id: 'asc' } as const,
    include: { product: { select: { slug: true } } },
  },
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  get client(): PrismaClient {
    return this.prisma;
  }

  findById(id: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  }

  findByIdAndUser(id: string, userId: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findFirst({
      where: { id, userId },
      include: ORDER_INCLUDE,
    });
  }

  async listByUser(userId: string, page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  findCouponByCode(code: string) {
    return this.prisma.coupon.findUnique({ where: { code } });
  }
}
