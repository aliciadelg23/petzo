'use client';

import { useQuery } from '@tanstack/react-query';
import { listCategories } from '@/features/catalog/api';

export default function AdminCategoriesPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(),
  });

  if (isPending) return <div className="h-64 animate-pulse rounded bg-neutral-100" />;
  if (isError || !data) return <p className="text-sm text-red-700">Falha ao carregar.</p>;

  const roots = data.items.filter((c) => c.parentId === null);
  const children = (parentId: string) => data.items.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        {data.items.length} categorias — visualização hierárquica.
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <ul className="space-y-2 text-sm">
          {roots.map((c) => (
            <li key={c.id}>
              <div className="font-medium text-neutral-900">
                {c.name} <code className="text-xs text-neutral-500">{c.slug}</code>
              </div>
              {children(c.id).length > 0 && (
                <ul className="ml-4 mt-1 space-y-1 border-l border-neutral-200 pl-3">
                  {children(c.id).map((sub) => (
                    <li key={sub.id} className="text-neutral-700">
                      {sub.name} <code className="text-xs text-neutral-500">{sub.slug}</code>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-500">
        Criação/edição de categorias virá em uma próxima etapa (endpoint admin para categorias
        ainda não implementado — nesta fase o CRUD administrativo se concentra em produtos,
        pedidos e estoque).
      </p>
    </div>
  );
}
