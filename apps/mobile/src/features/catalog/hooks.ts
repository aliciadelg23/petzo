import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import type { ListProductsQuery } from './api';

export const catalogKeys = {
  products: (q: ListProductsQuery) => ['products', q] as const,
  product: (slug: string) => ['product', slug] as const,
  categories: ['categories'] as const,
  brands: ['brands'] as const,
};

export function useProductsQuery(q: ListProductsQuery = {}) {
  return useQuery({
    queryKey: catalogKeys.products(q),
    queryFn: () => api.listProducts(q),
  });
}

export function useProductQuery(slug: string) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: () => api.getProduct(slug),
    enabled: !!slug,
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: api.listCategories,
    staleTime: 5 * 60_000,
  });
}
