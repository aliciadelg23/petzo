import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/format';

export type Species = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'FISH' | 'REPTILE' | 'RODENT' | 'OTHER';
export type Sort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  species: Species;
  active: boolean;
  available: boolean;
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string };
  images: { url: string; alt: string; position: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
}

export interface ListProductsQuery {
  search?: string;
  category?: string;
  brand?: string;
  species?: Species;
  minPrice?: number;
  maxPrice?: number;
  sort?: Sort;
  page?: number;
  limit?: number;
}

export function listProducts(q: ListProductsQuery = {}): Promise<ProductListResponse> {
  return http<ProductListResponse>(
    `/products${buildQueryString(q as Record<string, string | number | undefined>)}`,
    { skipAuth: true },
  );
}

export function getProduct(slug: string): Promise<Product> {
  return http<Product>(`/products/${encodeURIComponent(slug)}`, { skipAuth: true });
}

export function listCategories(): Promise<{ items: Category[] }> {
  return http<{ items: Category[] }>('/categories', { skipAuth: true });
}

export function listBrands(): Promise<{ items: Brand[] }> {
  return http<{ items: Brand[] }>('/brands', { skipAuth: true });
}
