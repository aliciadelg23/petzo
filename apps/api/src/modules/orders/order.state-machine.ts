import type { OrderStatus } from '@prisma/client';
import { ConflictError } from '@/shared/errors';

/**
 * Matriz de transições permitidas.
 *
 *   PENDING_PAYMENT -> PAID | CANCELLED
 *   PAID            -> PROCESSING | CANCELLED
 *   PROCESSING      -> SHIPPED | CANCELLED
 *   SHIPPED         -> DELIVERED
 *   DELIVERED       -> (terminal)
 *   CANCELLED       -> (terminal)
 *
 * Kept as a plain map (não classe) para ser trivialmente testável em unit tests.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) {
    // No-op idempotente NÃO é permitido pela matriz — rejeitamos explicitamente
    throw new ConflictError(`Pedido já está em ${from}.`);
  }
  if (!canTransition(from, to)) {
    throw new ConflictError(`Transição inválida: ${from} -> ${to}.`);
  }
}
