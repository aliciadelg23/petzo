import { describe, it, expect } from 'vitest';
import {
  computeDiscount,
  computeShipping,
  computeSubtotal,
  computeTotal,
  priceOrder,
} from './pricing';

describe('pricing', () => {
  describe('computeSubtotal', () => {
    it('soma unitPrice × quantity', () => {
      expect(
        computeSubtotal([
          { unitPrice: 1000, quantity: 2 },
          { unitPrice: 500, quantity: 3 },
        ]),
      ).toBe(2000 + 1500);
    });
    it('vazio → 0', () => {
      expect(computeSubtotal([])).toBe(0);
    });
  });

  describe('computeShipping', () => {
    it('cobra R$15,00 para subtotal abaixo de R$100', () => {
      expect(computeShipping(0)).toBe(15_00);
      expect(computeShipping(99_99)).toBe(15_00);
    });
    it('frete grátis a partir de R$100', () => {
      expect(computeShipping(100_00)).toBe(0);
      expect(computeShipping(500_00)).toBe(0);
    });
  });

  describe('computeDiscount', () => {
    it('sem cupom → 0', () => {
      expect(computeDiscount(10000, null)).toBe(0);
    });
    it('respeita minOrderAmount (não aplica se abaixo)', () => {
      const coupon = { discountPercent: 10, discountAmount: null, minOrderAmount: 20000 };
      expect(computeDiscount(15000, coupon)).toBe(0);
      expect(computeDiscount(30000, coupon)).toBe(3000);
    });
    it('discountPercent floor', () => {
      const coupon = { discountPercent: 10, discountAmount: null, minOrderAmount: null };
      expect(computeDiscount(1999, coupon)).toBe(199); // floor
    });
    it('discountAmount fixo em centavos', () => {
      const coupon = { discountPercent: null, discountAmount: 500, minOrderAmount: null };
      expect(computeDiscount(10000, coupon)).toBe(500);
    });
    it('cap em subtotal — nunca dá desconto maior que o subtotal', () => {
      const coupon = { discountPercent: null, discountAmount: 100_00, minOrderAmount: null };
      expect(computeDiscount(5000, coupon)).toBe(5000);
    });
  });

  describe('computeTotal', () => {
    it('subtotal - desconto + frete', () => {
      expect(computeTotal({ subtotal: 10000, shipping: 1500, discount: 1000 })).toBe(10500);
    });
    it('nunca negativo', () => {
      expect(computeTotal({ subtotal: 100, shipping: 0, discount: 500 })).toBe(0);
    });
  });

  describe('priceOrder (integração das partes)', () => {
    it('sem cupom, subtotal baixo → paga frete', () => {
      const r = priceOrder({
        lines: [{ unitPrice: 5000, quantity: 1 }],
        coupon: null,
      });
      expect(r.subtotal).toBe(5000);
      expect(r.shipping).toBe(1500);
      expect(r.discount).toBe(0);
      expect(r.total).toBe(6500);
    });

    it('subtotal alto → frete grátis + cupom aplicado', () => {
      const r = priceOrder({
        lines: [{ unitPrice: 10000, quantity: 2 }],
        coupon: { discountPercent: 10, discountAmount: null, minOrderAmount: 5000 },
      });
      expect(r.subtotal).toBe(20000);
      expect(r.shipping).toBe(0);
      expect(r.discount).toBe(2000);
      expect(r.total).toBe(18000);
    });
  });
});
