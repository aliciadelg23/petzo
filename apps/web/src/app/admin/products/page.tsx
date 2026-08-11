'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listProducts } from '@/features/catalog/api';
import { formatBRL } from '@/features/catalog/lib';
import { Button } from '@/components/ui/button';

// Reusa GET /products com bearer STAFF/ADMIN — o backend já responde com
// produtos inativos automaticamente quando enxerga um bearer com role staff+.
export default function AdminProductsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['admin', 'products', 'list'],
    queryFn: () => listProducts({ limit: 100 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {data ? `${data.total} produto${data.total === 1 ? '' : 's'}` : ''}
        </p>
        <Link href="/admin/products/new">
          <Button size="sm">+ Novo produto</Button>
        </Link>
      </div>

      {isPending && <div className="h-64 animate-pulse rounded bg-neutral-100" />}
      {isError && <p className="text-sm text-red-700">Falha ao carregar produtos.</p>}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Marca</th>
                <th className="p-3 text-right">Preço</th>
                <th className="p-3">Ativo</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="font-medium text-neutral-900 hover:text-brand-600"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-neutral-500">
                      <code>{p.slug}</code>
                    </div>
                  </td>
                  <td className="p-3">{p.category.name}</td>
                  <td className="p-3">{p.brand.name}</td>
                  <td className="p-3 text-right">{formatBRL(p.price)}</td>
                  <td className="p-3">
                    {p.active ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-xs text-brand-600 underline"
                    >
                      Editar
                    </Link>
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
