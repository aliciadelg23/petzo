import type { PrismaClient } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/shared/errors';
import type { CreateReviewBody, UpdateReviewBody } from './review.schemas';

/**
 * Regra crítica: só quem COMPROU o produto pode avaliar.
 * "Comprou" = existe OrderItem do produto em Order com status ≥ PAID
 * (PAID, PROCESSING, SHIPPED, DELIVERED). Cancelled não conta.
 */
const PURCHASED_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export class ReviewService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundError('Produto não encontrado.');

    const items = await this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    const count = items.length;
    const averageRating =
      count === 0 ? null : items.reduce((acc, r) => acc + r.rating, 0) / count;

    return {
      items: items.map((r) => ({
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        userName: r.user.name,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      averageRating,
      count,
    };
  }

  private async assertUserPurchased(userId: string, productId: string): Promise<void> {
    const count = await this.prisma.orderItem.count({
      where: {
        productId,
        order: {
          userId,
          status: { in: PURCHASED_STATUSES as unknown as string[] as never },
        },
      },
    });
    if (count === 0) {
      throw new ForbiddenError('Somente quem comprou o produto pode avaliá-lo.');
    }
  }

  async create(userId: string, productId: string, input: CreateReviewBody) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError('Produto não encontrado.');

    await this.assertUserPurchased(userId, productId);

    // Uma review por (produto, usuário) — unique constraint no schema
    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
    if (existing) {
      throw new ConflictError('Você já avaliou este produto (edite a existente).');
    }

    const created = await this.prisma.review.create({
      data: {
        productId,
        userId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
      },
      include: { user: { select: { name: true } } },
    });

    return this.toResponse(created);
  }

  async update(userId: string, reviewId: string, input: UpdateReviewBody) {
    if (Object.keys(input).length === 0) {
      throw new ConflictError('Envie ao menos um campo para atualizar.');
    }
    const existing = await this.prisma.review.findUnique({ where: { id: reviewId } });
    // 404 (não 403) para não vazar existência
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Review não encontrada.');
    }
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: input,
      include: { user: { select: { name: true } } },
    });
    return this.toResponse(updated);
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const existing = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Review não encontrada.');
    }
    await this.prisma.review.delete({ where: { id: reviewId } });
  }

  private toResponse(r: {
    id: string;
    productId: string;
    userId: string;
    user: { name: string };
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      userName: r.user.name,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
