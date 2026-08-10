'use client';

/**
 * Custom hook: URL como fonte da verdade dos filtros do catálogo.
 *
 * Substitui a duplicação vista em SearchBar / SortSelect / FilterPanel /
 * Pagination — todos precisavam:
 *   useRouter + usePathname + useSearchParams
 *   + parseProductsQuery(new URLSearchParams(sp.toString()))
 *   + buildProductsQueryString(mergeQuery(current, patch))
 *   + router.replace(pathname + qs, { scroll })
 *
 * Retorna `{ query, patch }`:
 *   - `query` — filtros derivados de searchParams (memoizado)
 *   - `patch` — aplica um delta ao query e atualiza a URL (estável)
 *
 * Escolhas defensáveis:
 * - `useMemo` em `query`: cria um NOVO objeto a cada render sem memo.
 *   Consumidores frequentemente o usam em `useEffect` deps
 *   (ex.: SearchBar iguala `initial` para saber se sincronizar).
 * - `useCallback` em `patch`: parte do contrato público — consumidores
 *   podem passar para memoized children ou usar em deps sem re-agendar.
 */
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { buildProductsQueryString, mergeQuery, parseProductsQuery } from './lib';
import type { ListProductsQuery } from './types';

interface UseCatalogUrlStateOptions {
  /** Se true, propaga com scroll para o topo. Default false (mantém posição). */
  scroll?: boolean;
}

export function useCatalogUrlState(options: UseCatalogUrlStateOptions = {}) {
  const { scroll = false } = options;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const query = useMemo<ListProductsQuery>(
    () => parseProductsQuery(new URLSearchParams(sp.toString())),
    [sp],
  );

  const patch = useCallback(
    (
      delta: Partial<ListProductsQuery>,
      opts?: { resetPage?: boolean },
    ): void => {
      const next = mergeQuery(query, delta, opts);
      router.replace(`${pathname}${buildProductsQueryString(next)}`, { scroll });
    },
    [query, pathname, router, scroll],
  );

  return { query, patch } as const;
}
