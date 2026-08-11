'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  useAdminOrdersQuery,
  useTransitionOrderStatusMutation,
} from '@/features/admin/hooks';
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge';
import { formatBRL } from '@/features/catalog/lib';
import { Button } from '@/components/ui/button';
import type { OrderStatus } from '@/features/admin/types';
import { HttpError } from '@/lib/errors';

/**
 * Matriz de transições permitidas — espelho da state-machine do backend.
 * (O backend valida oficialmente; aqui é só para não mostrar botões inválidos.)
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Marcar como Pago',
  PAID: 'Iniciar Preparação',
  PROCESSING: 'Marcar Enviado',
  SHIPPED: 'Marcar Entregue',
  DELIVERED: '',
  CANCELLED: '',
};

export default function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const list = useAdminOrdersQuery();
  const transition = useTransitionOrderStatusMutation();

  const order = list.data?.items.find((o) => o.id === id);

  if (list.isPending) {
    return <div className="h-64 animate-pulse rounded bg-neutral-100" />;
  }
  if (list.isError) {
    return <p className="text-sm text-red-700">Falha ao buscar pedidos.</p>;
  }
  if (!order) {
    return (
      <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
        Pedido não encontrado na página atual da lista.{' '}
        <Link className="text-brand-600 underline" href="/admin/orders">
          Voltar
        </Link>
      </div>
    );
  }

  const possibleTargets = TRANSITIONS[order.status];

  const doTransition = async (target: OrderStatus) => {
    try {
      await transition.mutateAsync({ id: order.id, status: target });
    } catch (err) {
      if (HttpError.isHttpError(err)) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="text-sm text-neutral-500 hover:text-brand-600">
        ← Todos os pedidos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">Pedido</p>
          <code className="text-sm">{order.id}</code>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(order.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Cliente</h2>
        <p className="mt-2 text-neutral-900">{order.customer.name}</p>
        <p className="text-neutral-500">{order.customer.email}</p>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Totais</h2>
        <p className="mt-2 text-neutral-900">
          {order.itemCount} {order.itemCount === 1 ? 'item' : 'itens'} —{' '}
          <strong>{formatBRL(order.total)}</strong>
        </p>
      </section>

      {possibleTargets.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Transições disponíveis</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {possibleTargets.map((t) => (
              <Button
                key={t}
                variant={t === 'CANCELLED' ? 'outline' : 'primary'}
                onClick={() => doTransition(t)}
                disabled={transition.isPending}
              >
                {LABEL[t] || (t === 'CANCELLED' ? 'Cancelar' : t)}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
