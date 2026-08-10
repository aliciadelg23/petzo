// RSC — listagem de produtos.
import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { listBrands, listCategories, listProducts } from '@/features/catalog/api';
import { parseProductsQuery } from '@/features/catalog/lib';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { SearchBar } from '@/features/catalog/components/search-bar';
import { SortSelect } from '@/features/catalog/components/sort-select';
import { FilterPanel } from '@/features/catalog/components/filter-panel';
import { Pagination } from '@/features/catalog/components/pagination';

export const metadata: Metadata = {
  title: 'Produtos',
  description:
    'Explore ração, brinquedos, higiene, medicamentos e acessórios para pets no catálogo Petzo.',
  alternates: { canonical: '/products' },
  openGraph: {
    title: 'Produtos · Petzo',
    description: 'Catálogo Petzo — tudo o que seu pet precisa.',
    url: '/products',
    type: 'website',
  },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = parseProductsQuery(sp);

  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    listProducts(query),
    listCategories(),
    listBrands(),
  ]);

  return (
    <Container className="py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Produtos</h1>
          <p className="text-sm text-neutral-600">
            {productsRes.total} {productsRes.total === 1 ? 'produto' : 'produtos'} disponíveis
          </p>
        </div>
        <div className="w-full sm:w-80">
          <SearchBar />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <FilterPanel categories={categoriesRes.items} brands={brandsRes.items} />

        <section>
          <div className="mb-4 flex items-center justify-end">
            <SortSelect />
          </div>
          <ProductGrid items={productsRes.items} />
          <Pagination page={productsRes.page} totalPages={productsRes.totalPages} />
        </section>
      </div>
    </Container>
  );
}
