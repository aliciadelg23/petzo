import type { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { computeDiscount, type CouponRule } from '../orders/pricing';
import type {
  CreateCouponBody,
  UpdateCouponBody,
  ValidateCouponBody,
} from './coupon.schemas';

/**
 * Serviço de cupons.
 *
 * Regra de precificação NÃO é duplicada — reusa `computeDiscount` do módulo
 * de orders/pricing.ts (mesma função que o checkout usa). Aqui só decidimos
 * se o cupom É VÁLIDO para o subtotal atual e devolvemos o desconto.
 */
export class CouponService {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Validate (usado pelo front antes do checkout — feedback rápido)
  // ---------------------------------------------------------------------------

  async validate(input: ValidateCouponBody) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: input.code } });
    if (!coupon) return { valid: false, reason: 'Cupom não encontrado.', discount: 0, code: null };
    if (!coupon.active) return { valid: false, reason: 'Cupom inativo.', discount: 0, code: coupon.code };
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, reason: 'Cupom ainda não é válido.', discount: 0, code: coupon.code };
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return { valid: false, reason: 'Cupom expirado.', discount: 0, code: coupon.code };
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: 'Limite de uso atingido.', discount: 0, code: coupon.code };
    }
    if (coupon.minOrderAmount != null && input.subtotal < coupon.minOrderAmount) {
      return {
        valid: false,
        reason: `Subtotal mínimo não atingido (necessário R$ ${(coupon.minOrderAmount / 100).toFixed(2)}).`,
        discount: 0,
        code: coupon.code,
      };
    }

    const rule: CouponRule = {
      discountPercent: coupon.discountPercent,
      discountAmount: coupon.discountAmount,
      minOrderAmount: coupon.minOrderAmount,
    };
    const discount = computeDiscount(input.subtotal, rule);
    return { valid: true, reason: null, discount, code: coupon.code };
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD
  // ---------------------------------------------------------------------------

  async list() {
    const items = await this.prisma.coupon.findMany({
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: items.map(this.toResponse) };
  }

  async create(input: CreateCouponBody) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: input.code } });
    if (existing) throw new ConflictError('Já existe cupom com este código.');
    const created = await this.prisma.coupon.create({
      data: {
        code: input.code,
        description: input.description,
        discountPercent: input.discountPercent,
        discountAmount: input.discountAmount,
        minOrderAmount: input.minOrderAmount,
        maxUses: input.maxUses,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        active: input.active,
      },
    });
    return this.toResponse(created);
  }

  async update(id: string, input: UpdateCouponBody) {
    if (Object.keys(input).length === 0) {
      throw new ValidationError('Envie ao menos um campo.');
    }
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Cupom não encontrado.');

    // Regra: percentual XOR fixo continua valendo se ambos vierem
    const nextPct = input.discountPercent !== undefined ? input.discountPercent : existing.discountPercent;
    const nextAmt = input.discountAmount !== undefined ? input.discountAmount : existing.discountAmount;
    if ((nextPct == null) === (nextAmt == null)) {
      throw new ValidationError('Exatamente um de discountPercent OU discountAmount.');
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        description: input.description,
        ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
        ...(input.discountAmount !== undefined ? { discountAmount: input.discountAmount } : {}),
        ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
        ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Cupom não encontrado.');
    // Soft-delete: preserva histórico de Order.couponId
    await this.prisma.coupon.update({ where: { id }, data: { active: false } });
  }

  private toResponse(c: {
    id: string;
    code: string;
    description: string | null;
    discountPercent: number | null;
    discountAmount: number | null;
    minOrderAmount: number | null;
    maxUses: number | null;
    usedCount: number;
    startsAt: Date | null;
    endsAt: Date | null;
    active: boolean;
    createdAt: Date;
  }) {
    return {
      id: c.id,
      code: c.code,
      description: c.description,
      discountPercent: c.discountPercent,
      discountAmount: c.discountAmount,
      minOrderAmount: c.minOrderAmount,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      active: c.active,
      createdAt: c.createdAt.toISOString(),
    };
  }
}
