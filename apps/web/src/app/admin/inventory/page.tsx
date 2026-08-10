'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useAdminInventoryQuery,
  useUpdateInventoryMutation,
} from '@/features/admin/hooks';
import { formatBRL } from '@/features/catalog/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HttpError } from '@/lib/errors';

export default function AdminInventoryPage() {
  const sp = useSearchParams();
  const lowStock = sp.get('lowStock') === 'true';
  const { data, isPending, isError } = useAdminInventoryQuery(lowStock);
  const update = useUpdateInventoryMutation();

  const [drafts, setDrafts] = useState<Record<string, { quantity: string; reorderPoint: string }>>({});

  const draftOf = (id: string, current: { quantity: number; reorderPoint: number }) =>
    drafts[id] ?? { quantity: String(current.quantity), reorderPoint: String(current.reorderPoint) };

  const save = async (productId: string) => {
    const d = drafts[productId];
    if (!d) return;
    const patch: { quantity?: number; reorderPoint?: number } = {};
    if (d.quantity.trim()) patch.quantity = Number(d.quantity);
    if (d.reorderPoint.trim()) patch.reorderPoint = Number(d.reorderPoint);
    try {
      await update.mutateAsync({ productId, patch });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } catch (err) {
      if (HttpError.isHttpError(err)) alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {lowStock ? 'Filtrando por estoque baixo' : `${data?.total ?? 0} produtos`}
        </p>
      </div>

      {isPending && <div className="h-64 animate-pulse rounded bg-neutral-100" />}
      {isError && <p className="text-sm text-red-700">Falha ao carregar estoque.</p>}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3 text-right">Preço</th>
                <th className="p-3">Quantidade</th>
                <th className="p-3">Reservado</th>
                <th className="p-3">Reorder point</th>
                <th className="p-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.map((it) => {
                const d = draftOf(it.productId, it);
                const isDirty = drafts[it.productId] !== undefined;
                const isLow = it.quantity < it.reorderPoint;
                return (
                  <tr key={it.productId} className={isLow ? 'bg-red-50/50' : ''}>
                    <td className="p-3">
                      <div className="font-medium text-neutral-900">{it.name}</div>
                      <div className="text-xs text-neutral-500">
                        {it.active ? 'ativo' : 'inativo'}
                      </div>
                    </td>
                    <td className="p-3 text-right">{formatBRL(it.price)}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={d.quantity}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [it.productId]: { ...d, quantity: e.target.value },
                          }))
                        }
                        className="h-8 w-24"
                      />
                    </td>
                    <td className="p-3 text-neutral-500">{it.reserved}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={d.reorderPoint}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [it.productId]: { ...d, reorderPoint: e.target.value },
                          }))
                        }
                        className="h-8 w-24"
                      />
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        onClick={() => save(it.productId)}
                        disabled={!isDirty || update.isPending}
                      >
                        Salvar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
