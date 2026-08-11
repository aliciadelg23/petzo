'use client';

import { use } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { useOrderQuery } from '@/features/orders/hooks';
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge';
import { formatBRL } from '@/features/catalog/lib';
import { AuthGuard } from '@/features/auth/components/auth-guard';

export default function CheckoutSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isPending, isError } = useOrderQuery(id);

  return (
    <AuthGuard>
      <Container className="max-w-2xl py-12">
        {isPending && <p className="text-neutral-600">Carregando pedido…</p>}
        {isError && <p className="text-red-700">Não foi possível carregar o pedido.</p>}
        {data && (
          <>
            <div className="text-center">
              <span aria-hidden className="text-5xl">🎉</span>
              <h1 className="mt-3 text-3xl font-bold text-neutral-900">Pedido confirmado</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Nº do pedido:{' '}
                <code className="rounded bg-neutral-100 px-1 text-xs">{data.id}</code>
              </p>
              <div className="mt-3 flex justify-center">
                <OrderStatusBadge status={data.status} />
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-neutral-900">Itens</h2>
              <ul className="mt-3 divide-y divide-neutral-200 text-sm">
                {data.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-neutral-900">{it.nameSnapshot}</p>
                      <p className="text-xs text-neutral-500">
                        {it.quantity} × {formatBRL(it.priceSnapshot)}
                      </p>
                    </div>
                    <p className="font-medium">{formatBRL(it.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t border-neutral-200 pt-3 text-sm">
                <Row label="Subtotal" value={formatBRL(data.subtotal)} />
                {data.discount > 0 && <Row label="Desconto" value={`- ${formatBRL(data.discount)}`} />}
                <Row
                  label="Frete"
                  value={data.shipping === 0 ? 'Grátis' : formatBRL(data.shipping)}
                />
                <Row label="Total" value={formatBRL(data.total)} strong />
              </dl>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/conta/pedidos" className="flex-1">
                <Button variant="outline" className="w-full">
                  Meus pedidos
                </Button>
              </Link>
              <Link href="/products" className="flex-1">
                <Button className="w-full">Continuar comprando</Button>
              </Link>
            </div>
          </>
        )}
      </Container>
    </AuthGuard>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-semibold text-neutral-900' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
