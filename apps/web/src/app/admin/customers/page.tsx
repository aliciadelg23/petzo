'use client';

import { useState } from 'react';
import { useAdminCustomersQuery } from '@/features/admin/hooks';
import { Input } from '@/components/ui/input';
import { formatBRL } from '@/features/catalog/lib';

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [committed, setCommitted] = useState<string | undefined>(undefined);
  const { data, isPending, isError } = useAdminCustomersQuery(committed);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCommitted(search.trim() || undefined);
        }}
        className="max-w-md"
      >
        <label htmlFor="cst-search" className="sr-only">
          Buscar clientes
        </label>
        <Input
          id="cst-search"
          type="search"
          placeholder="Buscar por nome ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {isPending && <div className="h-64 animate-pulse rounded bg-neutral-100" />}
      {isError && <p className="text-sm text-red-700">Falha ao carregar clientes.</p>}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Verificado</th>
                <th className="p-3">Pedidos</th>
                <th className="p-3 text-right">Total gasto</th>
                <th className="p-3">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-neutral-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td className="p-3">
                    <div className="font-medium text-neutral-900">{c.name}</div>
                    <div className="text-xs text-neutral-500">{c.email}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {c.emailVerifiedAt ? (
                      <span className="text-emerald-600">✓ Sim</span>
                    ) : (
                      <span className="text-neutral-400">Não</span>
                    )}
                  </td>
                  <td className="p-3">{c.ordersCount}</td>
                  <td className="p-3 text-right font-medium">{formatBRL(c.totalSpent)}</td>
                  <td className="p-3 text-xs text-neutral-500">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
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
