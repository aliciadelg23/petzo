import { http } from '@/lib/http';
import type { Product } from '@/features/catalog/types';

// Endpoints existentes de /products (POST/PATCH/DELETE) — reusados no admin.

export interface CreateProductInput {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  brandId: string;
  species: 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'FISH' | 'REPTILE' | 'RODENT' | 'OTHER';
  price: number;
  active: boolean;
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return http<Product>('/products', { method: 'POST', body: input });
}

export function updateProduct(
  id: string,
  patch: Partial<CreateProductInput>,
): Promise<Product> {
  return http<Product>(`/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function softDeleteProduct(id: string): Promise<void> {
  return http<void>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
