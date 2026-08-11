import { http } from '@/lib/http';
import type {
  Brand,
  Category,
  ListProductsQuery,
  Product,
  ProductListResponse,
} from './types';
import { buildProductsQueryString } from './lib';

/**
 * Fetch client para o catálogo. Chamável tanto em RSC (server) quanto em
 * Client Components. Reads públicas passam `skipAuth: true` para não tocar
 * no auth store no server (que é vazio de qualquer forma) e não injetar
 * Authorization desnecessário.
 *
 * Cache: passamos `next.revalidate` para RSC — o Next.js aplica só quando roda
 * no server. No browser, o Response Cache API do fetch é ignorado sem impacto.
 */

export function listProducts(
  query: ListProductsQuery = {},
  opts?: { revalidateSeconds?: number; tag?: string },
): Promise<ProductListResponse> {
  const qs = buildProductsQueryString(query);
  return http<ProductListResponse>(`/products${qs}`, {
    skipAuth: true,
    cache: 'force-cache',
    next: {
      revalidate: opts?.revalidateSeconds ?? 60,
      tags: opts?.tag ? ['catalog:products', opts.tag] : ['catalog:products'],
    },
  });
}

export function getProduct(slug: string): Promise<Product> {
  return http<Product>(`/products/${encodeURIComponent(slug)}`, {
    skipAuth: true,
    cache: 'force-cache',
    next: {
      revalidate: 60,
      tags: ['catalog:products', `catalog:product:${slug}`],
    },
  });
}

export function listCategories(): Promise<{ items: Category[] }> {
  return http<{ items: Category[] }>('/categories', {
    skipAuth: true,
    cache: 'force-cache',
    next: { revalidate: 300, tags: ['catalog:categories'] },
  });
}

export function listBrands(): Promise<{ items: Brand[] }> {
  return http<{ items: Brand[] }>('/brands', {
    skipAuth: true,
    cache: 'force-cache',
    next: { revalidate: 300, tags: ['catalog:brands'] },
  });
}
