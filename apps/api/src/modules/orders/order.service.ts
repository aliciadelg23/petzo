import type { PrismaClient, OrderStatus, Coupon } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import type { CheckoutBody, OrderResponse } from './order.schemas';
import type { OrderRepository, OrderWithRelations } from './order.repository';
import { assertTransition } from './order.state-machine';
import { priceOrder, type CouponRule } from './pricing';

/**
 * Checkout — TX única para garantir invariantes:
 *   1. Cart carregado
 *   2. Estoque decrementado ATOMICAMENTE por produto:
 *      UPDATE inventory SET quantity = quantity - N WHERE productId = ? AND quantity >= N
 *      Se rowsAffected === 0 → sem estoque → aborta a TX inteira (rollback).
 *      Isso vale mesmo em READ COMMITTED — o UPDATE condicional serializa.
 *   3. Preços recalculados NO SERVIDOR (client não envia preço nenhum)
 *   4. Cupom validado + ativo + minOrderAmount
 *   5. Order + OrderItems + Payment criados
 *   6. Cart esvaziado
 *   7. Coupon.usedCount incrementado
 *   8. Máquina de estados avança PENDING_PAYMENT -> PAID (simulação instantânea)
 */
export class OrderService {
  constructor(private readonly repo: OrderRepository) {}

  private get prisma(): PrismaClient {
    return this.repo.client;
  }

  async checkout(userId: string, input: CheckoutBody): Promise<OrderResponse> {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: { include: { inventory: true } },
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) {
        throw new ValidationError('Carrinho vazio.');
      }

      // Produto inativo — verificação simples (não muda com concorrência).
      for (const item of cart.items) {
        if (!item.product.active) {
          throw new ConflictError(`Produto "${item.product.name}" está indisponível.`);
        }
      }

      // Estoque: decremento ATÔMICO condicional.
      // O UPDATE serializa em READ COMMITTED — dois checkouts do último item
      // não podem ambos passar. O que perder retorna rowsAffected === 0.
      for (const it of cart.items) {
        const affected = await tx.$executeRaw`
          UPDATE "Inventory"
          SET quantity = quantity - ${it.quantity},
              "updatedAt" = NOW()
          WHERE "productId" = ${it.productId}
            AND quantity >= ${it.quantity}
        `;
        if (affected === 0) {
          const current = await tx.inventory.findUnique({
            where: { productId: it.productId },
            select: { quantity: true },
          });
          throw new ConflictError(
            `Estoque insuficiente para "${it.product.name}". Disponível: ${current?.quantity ?? 0}.`,
          );
        }
      }

      // Cupom
      let coupon: Coupon | null = null;
      let couponRule: CouponRule | null = null;
      if (input.couponCode) {
        coupon = await tx.coupon.findUnique({ where: { code: input.couponCode } });
        if (!coupon || !coupon.active) {
          throw new ValidationError('Cupom inválido.', { field: 'couponCode' });
        }
        const now = new Date();
        if (coupon.startsAt && coupon.startsAt > now) {
          throw new ValidationError('Cupom ainda não é válido.', { field: 'couponCode' });
        }
        if (coupon.endsAt && coupon.endsAt < now) {
          throw new ValidationError('Cupom expirado.', { field: 'couponCode' });
        }
        if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
          throw new ValidationError('Cupom sem usos disponíveis.', { field: 'couponCode' });
        }
        couponRule = {
          discountPercent: coupon.discountPercent,
          discountAmount: coupon.discountAmount,
          minOrderAmount: coupon.minOrderAmount,
        };
      }

      // Preços
      const lines = cart.items.map((it) => ({
        unitPrice: it.product.price,
        quantity: it.quantity,
      }));
      const { subtotal, shipping, discount, total } = priceOrder({ lines, coupon: couponRule });

      // Order + Items + Payment
      const created = await tx.order.create({
        data: {
          userId,
          status: 'PENDING_PAYMENT',
          subtotal,
          shipping,
          discount,
          total,
          couponId: coupon?.id,
          addressSnapshot: input.address,
          items: {
            create: cart.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              priceSnapshot: it.product.price,
              nameSnapshot: it.product.name,
            })),
          },
          payment: {
            create: {
              provider: 'PIX',
              status: 'PENDING',
              amount: total,
            },
          },
        },
        include: {
          items: { orderBy: { id: 'asc' }, include: { product: { select: { slug: true } } } },
          payment: true,
        },
      });

      // (Estoque já foi decrementado ATOMICAMENTE acima antes de criar a Order —
      // se qualquer produto não tinha estoque a TX toda foi abortada.)

      // Esvazia cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Incrementa usedCount do cupom
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Transição PENDING_PAYMENT -> PAID (simulação instantânea)
      assertTransition(created.status, 'PAID');
      const paid = await tx.order.update({
        where: { id: created.id },
        data: {
          status: 'PAID',
          payment: {
            update: { status: 'CAPTURED', paidAt: new Date() },
          },
        },
        include: {
          items: { orderBy: { id: 'asc' }, include: { product: { select: { slug: true } } } },
          payment: true,
        },
      });

      return paid;
    });

    return this.toResponse(order);
  }

  async listMyOrders(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: OrderResponse[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const { items, total } = await this.repo.listByUser(userId, page, limit);
    return {
      items: items.map((o) => this.toResponse(o)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMyOrder(userId: string, id: string): Promise<OrderResponse> {
    const o = await this.repo.findByIdAndUser(id, userId);
    if (!o) throw new NotFoundError('Pedido não encontrado.');
    return this.toResponse(o);
  }

  /**
   * Transita status. NÃO exposto por rota nesta fase — usado internamente
   * (checkout) e disponível para a próxima etapa (painel STAFF/ADMIN).
   */
  async transitionTo(id: string, target: OrderStatus): Promise<OrderResponse> {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundError('Pedido não encontrado.');
    assertTransition(current.status, target);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: target },
      include: {
        items: { orderBy: { id: 'asc' }, include: { product: { select: { slug: true } } } },
        payment: true,
      },
    });
    return this.toResponse(updated);
  }

  // ---------------------------------------------------------------------------
  // Mapper
  // ---------------------------------------------------------------------------

  private toResponse(o: OrderWithRelations): OrderResponse {
    return {
      id: o.id,
      status: o.status,
      subtotal: o.subtotal,
      shipping: o.shipping,
      discount: o.discount,
      total: o.total,
      addressSnapshot: o.addressSnapshot as unknown as OrderResponse['addressSnapshot'],
      couponCode: null,
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        slug: it.product.slug,
        nameSnapshot: it.nameSnapshot,
        priceSnapshot: it.priceSnapshot,
        quantity: it.quantity,
        lineTotal: it.priceSnapshot * it.quantity,
      })),
      payment: o.payment
        ? {
            id: o.payment.id,
            provider: o.payment.provider,
            status: o.payment.status,
            amount: o.payment.amount,
            paidAt: o.payment.paidAt?.toISOString() ?? null,
          }
        : null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}
