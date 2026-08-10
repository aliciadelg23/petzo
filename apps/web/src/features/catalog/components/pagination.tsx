'use client';

// CLIENT — navegação de páginas. Preserva demais filtros via useCatalogUrlState.

import { Button } from '@/components/ui/button';
import { useCatalogUrlState } from '../use-catalog-url-state';

interface Props {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: Props) {
  const { patch } = useCatalogUrlState();

  if (totalPages <= 1) return null;

  const go = (target: number) => {
    if (target < 1 || target > totalPages) return;
    patch({ page: target }, { resetPage: false });
  };

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2 pt-8">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => go(page - 1)}>
        Anterior
      </Button>
      <span className="text-sm text-neutral-700">
        Página {page} de {totalPages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
