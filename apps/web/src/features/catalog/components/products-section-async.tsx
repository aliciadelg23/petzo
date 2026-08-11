// RSC async — busca produtos + renderiza header + grid + paginação.
// Envolvido em <Suspense> na page para streamar independente do sidebar.

import { listProducts } from '../api';
import type { ListProductsQuery } from '../types';
import { ProductGrid } from './product-grid';
import { Pagination } from './pagination';
import { SortSelect } from './sort-select';

interface Props {
  query: ListProductsQuery;
  /** Cabeçalho com total de itens — opcional, RSC recebe pronto. */
  onTotal?: (total: number) => void;
}

export async function ProductsSectionAsync({ query }: Props) {
  const res = await listProducts(query);
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {res.total} {res.total === 1 ? 'produto' : 'produtos'} encontrados
        </p>
        <SortSelect />
      </div>
      <ProductGrid items={res.items} />
      <Pagination page={res.page} totalPages={res.totalPages} />
    </section>
  );
}
