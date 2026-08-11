// Espelho tipado das respostas da API (apps/api). Se um dia extrairmos
// packages/types compartilhado, esses tipos vêm de lá.

export type Species =
  | 'DOG'
  | 'CAT'
  | 'BIRD'
  | 'RABBIT'
  | 'FISH'
  | 'REPTILE'
  | 'RODENT'
  | 'OTHER';

export type Sort =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc';

export interface ProductImage {
  url: string;
  alt: string;
  position: number;
}

export interface ProductRelated {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Preço em centavos (BRL). */
  price: number;
  species: Species;
  active: boolean;
  available: boolean;
  category: ProductRelated;
  brand: ProductRelated;
  images: ProductImage[];
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
  available?: boolean;
  sort?: Sort;
  page?: number;
  limit?: number;
}
