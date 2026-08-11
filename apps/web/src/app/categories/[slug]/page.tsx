// RSC — página de categoria. Reusa a listagem filtrada por category.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import {
  listBrands,
  listCategories,
  listProducts,
} from '@/features/catalog/api';
import { parseProductsQuery } from '@/features/catalog/lib';
import { ProductGrid } from '@/features/catalog/components/product-grid';
import { SortSelect } from '@/features/catalog/components/sort-select';
import { FilterPanel } from '@/features/catalog/components/filter-panel';
import { Pagination } from '@/features/catalog/components/pagination';
import { SearchBar } from '@/features/catalog/components/search-bar';
import { BreadcrumbJsonLd } from '@/features/catalog/components/product-json-ld';
import { env } from '@/config/env';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function findCategory(slug: string) {
  const res = await listCategories();
  return res.items.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) return { title: 'Categoria não encontrada' };
  return {
    title: cat.name,
    description: `Produtos da categoria ${cat.name} no catálogo Petzo.`,
    alternates: { canonical: `/categories/${cat.slug}` },
    openGraph: {
      title: `${cat.name} · Petzo`,
      description: `Explore os produtos da categoria ${cat.name}.`,
      url: `/categories/${cat.slug}`,
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await findCategory(slug);
  if (!category) notFound();

  const query = { ...parseProductsQuery(sp), category: category.slug };
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    listProducts(query),
    listCategories(),
    listBrands(),
  ]);

  const siteUrl = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Início', url: `${siteUrl}/` },
          { name: 'Produtos', url: `${siteUrl}/products` },
          {
            name: category.name,
            url: `${siteUrl}/categories/${category.slug}`,
          },
        ]}
      />

      <Container className="py-8">
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-neutral-500">
          <ol className="flex flex-wrap gap-1">
            <li>
              <Link href="/products" className="hover:text-brand-600">
                Produtos
              </Link>
              <span aria-hidden className="mx-1">
                /
              </span>
            </li>
            <li className="text-neutral-900">{category.name}</li>
          </ol>
        </nav>

        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{category.name}</h1>
            <p className="text-sm text-neutral-600">
              {productsRes.total} {productsRes.total === 1 ? 'produto' : 'produtos'} nesta categoria
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
    </>
  );
}
