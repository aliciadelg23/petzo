'use client';

import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useOrdersQuery } from '@/features/orders/hooks';
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge';
import { formatBRL } from '@/features/catalog/lib';

export default function OrdersListPage() {
  const { data, isPending, isError } = useOrdersQuery(1, 20);

  if (isPending) {
    return (
      <Container className="py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-neutral-100" />
          ))}
        </div>
      </Container>
    );
  }
  if (isError) {
    return (
      <Container className="py-8">
        <p className="text-red-700">Não foi possível carregar seus pedidos.</p>
      </Container>
    );
  }

  const items = data?.items ?? [];

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold text-neutral-900">Meus pedidos</h1>
      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
          <span aria-hidden className="text-4xl">📦</span>
          <p className="text-neutral-700">Você ainda não tem pedidos.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((o) => (
            <li
              key={o.id}
              className="flex flex-col items-start gap-2 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/conta/pedidos/${o.id}`}
                  className="text-sm font-medium text-neutral-900 hover:text-brand-600"
                >
                  Pedido {o.id}
                </Link>
                <p className="text-xs text-neutral-500">
                  {new Date(o.createdAt).toLocaleDateString('pt-BR')} · {o.items.length}{' '}
                  {o.items.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <span className="font-semibold text-neutral-900">{formatBRL(o.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
