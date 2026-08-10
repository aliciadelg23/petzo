import { describe, it, expect } from 'vitest';
import {
  buildProductsQueryString,
  formatBRL,
  mergeQuery,
  parseProductsQuery,
} from './lib';

describe('formatBRL', () => {
  it('formata centavos em BRL com duas casas', () => {
    expect(formatBRL(0)).toContain('0,00');
    expect(formatBRL(1)).toContain('0,01');
    expect(formatBRL(999)).toContain('9,99');
    expect(formatBRL(1500)).toContain('15,00');
    expect(formatBRL(18990)).toContain('189,90');
  });

  it('valores negativos caem em 0,00 (soft fail)', () => {
    expect(formatBRL(-100)).toContain('0,00');
  });
});

describe('buildProductsQueryString', () => {
  it('vazio para query sem filtros úteis', () => {
    expect(buildProductsQueryString({})).toBe('');
    expect(buildProductsQueryString({ sort: 'newest', page: 1, limit: 20 })).toBe('');
  });

  it('inclui apenas params não-default', () => {
    expect(buildProductsQueryString({ search: 'racao' })).toBe('?search=racao');
    expect(buildProductsQueryString({ category: 'caes' })).toBe('?category=caes');
    expect(buildProductsQueryString({ page: 2 })).toBe('?page=2');
    expect(buildProductsQueryString({ limit: 5 })).toBe('?limit=5');
    expect(buildProductsQueryString({ available: true })).toBe('?available=true');
  });

  it('combina múltiplos filtros preservando ordem estável', () => {
    const qs = buildProductsQueryString({
      search: 'racao',
      category: 'caes',
      sort: 'price_asc',
      page: 2,
    });
    expect(qs).toContain('search=racao');
    expect(qs).toContain('category=caes');
    expect(qs).toContain('sort=price_asc');
    expect(qs).toContain('page=2');
  });
});

describe('parseProductsQuery', () => {
  it('aplica defaults para query vazia', () => {
    const q = parseProductsQuery({});
    expect(q.page).toBe(1);
    expect(q.limit).toBe(20);
    expect(q.sort).toBe('newest');
    expect(q.search).toBeUndefined();
  });

  it('coerce numérico e falha soft para não-números', () => {
    expect(parseProductsQuery({ page: '3' }).page).toBe(3);
    expect(parseProductsQuery({ page: 'abc' }).page).toBe(1);
    expect(parseProductsQuery({ minPrice: '1000' }).minPrice).toBe(1000);
    expect(parseProductsQuery({ maxPrice: 'lol' }).maxPrice).toBeUndefined();
  });

  it('sort inválido cai para newest', () => {
    expect(parseProductsQuery({ sort: 'random' }).sort).toBe('newest');
    expect(parseProductsQuery({ sort: 'price_asc' }).sort).toBe('price_asc');
  });

  it('aceita URLSearchParams direto', () => {
    const sp = new URLSearchParams('search=bola&page=2');
    const q = parseProductsQuery(sp);
    expect(q.search).toBe('bola');
    expect(q.page).toBe(2);
  });

  it('available só é true quando literalmente "true"', () => {
    expect(parseProductsQuery({ available: 'true' }).available).toBe(true);
    expect(parseProductsQuery({ available: 'false' }).available).toBeUndefined();
    expect(parseProductsQuery({ available: '1' }).available).toBeUndefined();
  });
});

describe('mergeQuery', () => {
  it('resetPage=true (default) volta page a 1 em mudança de filtro', () => {
    const cur = { page: 3, sort: 'newest' as const, search: 'x' };
    const next = mergeQuery(cur, { category: 'caes' });
    expect(next.page).toBe(1);
    expect(next.category).toBe('caes');
  });

  it('mudança apenas de page preserva page passada', () => {
    const cur = { page: 3, sort: 'newest' as const };
    const next = mergeQuery(cur, { page: 5 });
    expect(next.page).toBe(5);
  });

  it('resetPage=false preserva page em qualquer mudança', () => {
    const cur = { page: 3, sort: 'newest' as const };
    const next = mergeQuery(cur, { category: 'x' }, { resetPage: false });
    expect(next.page).toBe(3);
  });
});
