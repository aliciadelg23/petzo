'use client';

// CLIENT — botões <Link> não seriam pré-navegáveis com preserve-scroll.
// Usamos router.replace para atualizar só o page= mantendo os demais filtros.

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { buildProductsQueryString, mergeQuery, parseProductsQuery } from '../lib';
import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (target: number) => {
    if (target < 1 || target > totalPages) return;
    const current = parseProductsQuery(new URLSearchParams(sp.toString()));
    const next = mergeQuery(current, { page: target }, { resetPage: false });
    router.replace(`${pathname}${buildProductsQueryString(next)}`);
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
