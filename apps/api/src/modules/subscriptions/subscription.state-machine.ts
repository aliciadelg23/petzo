import type { SubscriptionStatus } from '@prisma/client';
import { ConflictError } from '@/shared/errors';

/**
 * Matriz de transições da subscription.
 *
 *   ACTIVE    <-> PAUSED
 *   ACTIVE    -> CANCELLED
 *   PAUSED    -> CANCELLED
 *   CANCELLED (terminal)
 */
export const SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  ACTIVE: ['PAUSED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return SUBSCRIPTION_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (from === to) {
    throw new ConflictError(`Assinatura já está em ${from}.`);
  }
  if (!canTransition(from, to)) {
    throw new ConflictError(`Transição inválida: ${from} -> ${to}.`);
  }
}
