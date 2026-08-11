// RSC — listagem de produtos com streaming via Suspense.
//
// Escolhas defensáveis:
// - `<Suspense>` em dois pontos: FiltersAside e ProductsSection. Cada um faz
//   seu próprio fetch async. O que terminar antes streama antes — sidebar
//   (categories/brands com cache 300s) tipicamente aparece antes do grid
//   (produtos, cache 60s + variação por query).
// - `key={sp-json}` na ProductsSection: força remontagem quando os filtros
//   mudam via URL, ativando o fallback do Suspense e mostrando skeleton.
//   Sem `key`, o Next re-renderizaria o server component sem novo boundary.
// - SearchBar e FiltersAside vivem FORA do <Suspense> do grid: filtros ficam
//   sempre visíveis e responsivos enquanto o grid re-fetcha.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/ui/container';
import { parseProductsQuery } from '@/features/catalog/lib';
import { SearchBar } from '@/features/catalog/components/search-bar';
import { FiltersAsideAsync } from '@/features/catalog/components/filters-aside-async';
import { ProductsSectionAsync } from '@/features/catalog/components/products-section-async';
import {
  FiltersSkeleton,
  ProductsSkeleton,
} from '@/features/catalog/components/catalog-skeletons';

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
  // Chave estável baseada na query — usada para remontar a boundary do grid.
  const gridKey = JSON.stringify(query);

  return (
    <Container className="py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-neutral-900">Produtos</h1>
        <div className="w-full sm:w-80">
          <SearchBar />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={<FiltersSkeleton />}>
          <FiltersAsideAsync />
        </Suspense>

        <Suspense key={gridKey} fallback={<ProductsSkeleton />}>
          <ProductsSectionAsync query={query} />
        </Suspense>
      </div>
    </Container>
  );
}
