'use client';

import { use } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useOrderQuery } from '@/features/orders/hooks';
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge';
import { formatBRL } from '@/features/catalog/lib';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isPending, isError } = useOrderQuery(id);

  if (isPending) {
    return (
      <Container className="py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
      </Container>
    );
  }

  if (isError || !data) {
    return (
      <Container className="py-12 text-center">
        <p className="text-neutral-700">Pedido não encontrado.</p>
        <Link href="/conta/pedidos" className="mt-3 inline-block text-sm text-brand-600 underline">
          Voltar para meus pedidos
        </Link>
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-8">
      <Link
        href="/conta/pedidos"
        className="text-sm text-neutral-500 hover:text-brand-600"
      >
        ← Meus pedidos
      </Link>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Pedido</h1>
          <p className="text-sm text-neutral-500">
            <code className="text-xs">{data.id}</code>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(data.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <OrderStatusBadge status={data.status} />
      </div>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Itens</h2>
        <ul className="mt-3 divide-y divide-neutral-200 text-sm">
          {data.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-2">
              <div>
                <Link href={`/products/${it.slug}`} className="text-neutral-900 hover:text-brand-600">
                  {it.nameSnapshot}
                </Link>
                <p className="text-xs text-neutral-500">
                  {it.quantity} × {formatBRL(it.priceSnapshot)}
                </p>
              </div>
              <p className="font-medium">{formatBRL(it.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Totais</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row label="Subtotal" value={formatBRL(data.subtotal)} />
          {data.discount > 0 && <Row label="Desconto" value={`- ${formatBRL(data.discount)}`} />}
          <Row label="Frete" value={data.shipping === 0 ? 'Grátis' : formatBRL(data.shipping)} />
          <Row label="Total" value={formatBRL(data.total)} strong />
        </dl>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Endereço de entrega</h2>
        <p className="mt-2 text-neutral-800">
          {data.addressSnapshot.street}, {data.addressSnapshot.number}
          {data.addressSnapshot.complement ? ` — ${data.addressSnapshot.complement}` : ''}
        </p>
        <p className="text-neutral-800">
          {data.addressSnapshot.district} · {data.addressSnapshot.city}/{data.addressSnapshot.state}
        </p>
        <p className="text-neutral-500">CEP {data.addressSnapshot.zip}</p>
      </section>

      {data.payment && (
        <section className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Pagamento</h2>
          <p className="mt-2 text-neutral-800">
            {data.payment.provider} · {data.payment.status}
          </p>
          {data.payment.paidAt && (
            <p className="text-xs text-neutral-500">
              Pago em {new Date(data.payment.paidAt).toLocaleString('pt-BR')}
            </p>
          )}
        </section>
      )}
    </Container>
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
