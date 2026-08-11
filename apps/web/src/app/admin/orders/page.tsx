'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminOrdersQuery } from '@/features/admin/hooks';
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge';
import { formatBRL } from '@/features/catalog/lib';
import type { OrderStatus } from '@/features/admin/types';

const STATUS_FILTERS: (OrderStatus | 'ALL')[] = [
  'ALL',
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const LABEL: Record<OrderStatus | 'ALL', string> = {
  ALL: 'Todos',
  PENDING_PAYMENT: 'Aguard. pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const { data, isPending, isError } = useAdminOrdersQuery(
    filter === 'ALL' ? undefined : filter,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1 text-xs ${
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-neutral-100" />
          ))}
        </div>
      )}
      {isError && <p className="text-sm text-red-700">Falha ao carregar pedidos.</p>}
      {data && data.items.length === 0 && (
        <p className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
          Nenhum pedido no filtro.
        </p>
      )}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Pedido</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Status</th>
                <th className="p-3">Itens</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      <code className="text-xs">{o.id.slice(-8)}</code>
                    </Link>
                  </td>
                  <td className="p-3">
                    <div>{o.customer.name}</div>
                    <div className="text-xs text-neutral-500">{o.customer.email}</div>
                  </td>
                  <td className="p-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="p-3">{o.itemCount}</td>
                  <td className="p-3 text-right font-medium">{formatBRL(o.total)}</td>
                  <td className="p-3 text-xs text-neutral-500">
                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
