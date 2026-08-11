import { describe, it, expect } from 'vitest';
import {
  assertTransition,
  canTransition,
  SUBSCRIPTION_TRANSITIONS,
} from './subscription.state-machine';
import { AppError } from '@/shared/errors';

describe('SubscriptionStatus state machine', () => {
  it('transições permitidas', () => {
    expect(canTransition('ACTIVE', 'PAUSED')).toBe(true);
    expect(canTransition('ACTIVE', 'CANCELLED')).toBe(true);
    expect(canTransition('PAUSED', 'ACTIVE')).toBe(true);
    expect(canTransition('PAUSED', 'CANCELLED')).toBe(true);
  });

  it('CANCELLED é terminal', () => {
    expect(SUBSCRIPTION_TRANSITIONS.CANCELLED.length).toBe(0);
    expect(canTransition('CANCELLED', 'ACTIVE')).toBe(false);
    expect(canTransition('CANCELLED', 'PAUSED')).toBe(false);
  });

  it('assertTransition rejeita idempotente (from === to)', () => {
    expect(() => assertTransition('ACTIVE', 'ACTIVE')).toThrow(AppError);
  });

  it('assertTransition lança para transição inválida com code CONFLICT', () => {
    try {
      assertTransition('CANCELLED', 'ACTIVE');
      throw new Error('deveria ter lançado');
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      expect(e.code).toBe('CONFLICT');
      expect(e.message).toMatch(/Transição inválida/i);
    }
  });
});
