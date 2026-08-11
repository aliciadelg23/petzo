'use client';

import Link from 'next/link';
import { useDashboardMetricsQuery } from '@/features/admin/hooks';
import { MetricCard } from '@/features/admin/components/metric-card';
import { SalesChart } from '@/features/admin/components/sales-chart';
import { OrdersStatusChart } from '@/features/admin/components/orders-status-chart';
import { formatBRL } from '@/features/catalog/lib';

export default function AdminDashboardPage() {
  const { data, isPending, isError } = useDashboardMetricsQuery();

  if (isPending) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-red-700">Não foi possível carregar as métricas.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Vendas (total)"
          value={formatBRL(data.sales.total)}
          hint={`${data.sales.count} pedido${data.sales.count === 1 ? '' : 's'} pagos`}
        />
        <MetricCard
          label="Ticket médio"
          value={formatBRL(data.sales.avgTicket)}
        />
        <MetricCard
          label="Pedidos pendentes"
          value={String(data.orders.pending)}
          hint="Ainda não entregues"
        />
        <MetricCard
          label="Clientes"
          value={String(data.customers.total)}
          hint={`+${data.customers.newLast30d} nos últimos 30 dias`}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SalesChart data={data.sales.series} />
        <OrdersStatusChart data={data.orders.byStatus} />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <header className="flex items-center justify-between border-b border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Estoque baixo ({data.products.lowStock.length})
          </h2>
          <Link href="/admin/inventory?lowStock=true" className="text-xs text-brand-600 underline">
            Ver todos
          </Link>
        </header>
        {data.products.lowStock.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">
            Nenhum produto abaixo do reorderPoint 🎉
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 text-sm">
            {data.products.lowStock.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4">
                <Link
                  href={`/admin/inventory`}
                  className="text-neutral-900 hover:text-brand-600"
                >
                  {p.name}
                </Link>
                <span className="text-neutral-500">
                  <strong className="text-red-600">{p.quantity}</strong> / {p.reorderPoint}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Produtos</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {data.products.active} ativos de {data.products.total} totais.
        </p>
      </section>
    </div>
  );
}
