import type { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { NotFoundError } from '@/shared/errors';
import { assertTransition } from './subscription.state-machine';
import type { CreateSubscriptionBody } from './subscription.schemas';

/**
 * Assinatura recorrente — metadata + estado. NÃO faz cobrança financeira real
 * (fora do escopo desta fase; pagamento continua simulado no checkout).
 *
 * `nextChargeAt` é ilustrativo — em produção um cron chamaria o billing.
 */
const NEXT_CHARGE_DAYS: Record<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY', number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
  QUARTERLY: 90,
};

export class SubscriptionService {
  constructor(private readonly prisma: PrismaClient) {}

  async listMine(userId: string) {
    const items = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { slug: true, name: true, price: true } } },
    });
    return {
      items: items.map((s) => this.toResponse(s)),
    };
  }

  async create(userId: string, input: CreateSubscriptionBody) {
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundError('Produto não encontrado.');

    const now = new Date();
    const nextChargeAt = new Date(now);
    nextChargeAt.setUTCDate(nextChargeAt.getUTCDate() + NEXT_CHARGE_DAYS[input.frequency]);

    const created = await this.prisma.subscription.create({
      data: {
        userId,
        productId: input.productId,
        frequency: input.frequency,
        status: 'ACTIVE',
        nextChargeAt,
      },
      include: { product: { select: { slug: true, name: true, price: true } } },
    });
    return this.toResponse(created);
  }

  async transitionStatus(userId: string, id: string, target: SubscriptionStatus) {
    const current = await this.prisma.subscription.findUnique({
      where: { id },
      include: { product: { select: { slug: true, name: true, price: true } } },
    });
    // 404 para alheio — não vaza existência
    if (!current || current.userId !== userId) {
      throw new NotFoundError('Assinatura não encontrada.');
    }

    assertTransition(current.status, target);

    const patch: {
      status: SubscriptionStatus;
      canceledAt?: Date | null;
      nextChargeAt?: Date | null;
    } = { status: target };
    if (target === 'CANCELLED') {
      patch.canceledAt = new Date();
      patch.nextChargeAt = null;
    }
    if (target === 'PAUSED') {
      patch.nextChargeAt = null;
    }
    if (target === 'ACTIVE') {
      // Ao retomar, agenda próxima cobrança relativa a AGORA
      const now = new Date();
      const nc = new Date(now);
      nc.setUTCDate(nc.getUTCDate() + NEXT_CHARGE_DAYS[current.frequency]);
      patch.nextChargeAt = nc;
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: patch,
      include: { product: { select: { slug: true, name: true, price: true } } },
    });
    return this.toResponse(updated);
  }

  private toResponse(s: {
    id: string;
    userId: string;
    productId: string;
    frequency: string;
    status: string;
    nextChargeAt: Date | null;
    canceledAt: Date | null;
    createdAt: Date;
    product: { slug: string; name: string; price: number };
  }) {
    return {
      id: s.id,
      userId: s.userId,
      productId: s.productId,
      productSlug: s.product.slug,
      productName: s.product.name,
      productPrice: s.product.price,
      frequency: s.frequency as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY',
      status: s.status as SubscriptionStatus,
      nextChargeAt: s.nextChargeAt?.toISOString() ?? null,
      canceledAt: s.canceledAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
