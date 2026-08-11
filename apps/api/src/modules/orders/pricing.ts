/**
 * Cálculo de preços — separado do service para ser puro e testável.
 *
 * Todas as regras vivem AQUI. O frontend nunca envia preços, e o service
 * usa exclusivamente estas funções para decidir subtotal / desconto / frete / total.
 */

export interface OrderLine {
  /** Preço unitário atual em centavos. */
  unitPrice: number;
  quantity: number;
}

export interface CouponRule {
  /** 0..100 exclusivo com discountAmount. */
  discountPercent: number | null;
  /** Centavos. Exclusivo com discountPercent. */
  discountAmount: number | null;
  /** Valor mínimo em centavos para o cupom valer. */
  minOrderAmount: number | null;
}

/** Soma dos line totals. */
export function computeSubtotal(lines: OrderLine[]): number {
  return lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
}

/**
 * Frete plano: R$ 15,00 (1500 centavos).
 * Frete grátis para pedidos com subtotal >= R$ 100,00.
 * (Placeholder — em produção viria de integração com transportadora + CEP.)
 */
export function computeShipping(subtotal: number): number {
  if (subtotal >= 100_00) return 0;
  return 15_00;
}

/**
 * Aplica cupom respeitando `minOrderAmount`.
 * Retorna 0 se cupom for inválido para este subtotal.
 * Nunca ultrapassa o subtotal (desconto máximo = subtotal).
 */
export function computeDiscount(subtotal: number, coupon: CouponRule | null): number {
  if (!coupon) return 0;
  if (coupon.minOrderAmount != null && subtotal < coupon.minOrderAmount) return 0;

  let discount = 0;
  if (coupon.discountPercent != null) {
    discount = Math.floor((subtotal * coupon.discountPercent) / 100);
  } else if (coupon.discountAmount != null) {
    discount = coupon.discountAmount;
  }
  return Math.min(discount, subtotal);
}

export function computeTotal(input: {
  subtotal: number;
  shipping: number;
  discount: number;
}): number {
  return Math.max(0, input.subtotal - input.discount + input.shipping);
}

/**
 * Snapshot completo de precificação usado no checkout.
 */
export function priceOrder(input: {
  lines: OrderLine[];
  coupon: CouponRule | null;
}): {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
} {
  const subtotal = computeSubtotal(input.lines);
  const shipping = computeShipping(subtotal);
  const discount = computeDiscount(subtotal, input.coupon);
  const total = computeTotal({ subtotal, shipping, discount });
  return { subtotal, shipping, discount, total };
}
