import { describe, it, expect } from 'vitest';
import { assertTransition, canTransition, ORDER_TRANSITIONS } from './order.state-machine';
import { AppError } from '@/shared/errors';

describe('OrderStatus state machine', () => {
  it('lista completa de transições permitidas', () => {
    expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition('PENDING_PAYMENT', 'CANCELLED')).toBe(true);
    expect(canTransition('PAID', 'PROCESSING')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
    expect(canTransition('PROCESSING', 'SHIPPED')).toBe(true);
    expect(canTransition('PROCESSING', 'CANCELLED')).toBe(true);
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
  });

  it('rejeita transições retroativas ou pulos', () => {
    expect(canTransition('PAID', 'PENDING_PAYMENT')).toBe(false);
    expect(canTransition('PROCESSING', 'PAID')).toBe(false);
    expect(canTransition('SHIPPED', 'PROCESSING')).toBe(false);
    expect(canTransition('PENDING_PAYMENT', 'DELIVERED')).toBe(false);
  });

  it('estados terminais não têm sucessores', () => {
    expect(ORDER_TRANSITIONS.DELIVERED.length).toBe(0);
    expect(ORDER_TRANSITIONS.CANCELLED.length).toBe(0);
    expect(canTransition('DELIVERED', 'PAID')).toBe(false);
    expect(canTransition('CANCELLED', 'PAID')).toBe(false);
  });

  it('não permite transição para o mesmo estado (idempotente rejeitado)', () => {
    expect(() => assertTransition('PAID', 'PAID')).toThrow(AppError);
  });

  it('assertTransition lança para transição inválida com código CONFLICT', () => {
    try {
      assertTransition('SHIPPED', 'PROCESSING');
      throw new Error('deveria ter lançado');
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      expect(e.code).toBe('CONFLICT');
      expect(e.message).toMatch(/Transição inválida/i);
    }
  });

  it('DELIVERED não pode ser cancelado', () => {
    expect(canTransition('DELIVERED', 'CANCELLED')).toBe(false);
  });
});
