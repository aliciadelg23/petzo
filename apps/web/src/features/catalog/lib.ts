import type { ListProductsQuery, Sort } from './types';

// -----------------------------------------------------------------------------
// Formatação
// -----------------------------------------------------------------------------

/**
 * Converte centavos (Int) em BRL (R$ X,YZ). Falha soft para valores negativos
 * (retorna R$ 0,00) — mantém UI consistente sem crash.
 */
export function formatBRL(cents: number): string {
  const value = Math.max(0, cents) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export const SORT_LABELS: Record<Sort, string> = {
  newest: 'Mais recentes',
  oldest: 'Mais antigos',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name_asc: 'Nome (A→Z)',
  name_desc: 'Nome (Z→A)',
};

// -----------------------------------------------------------------------------
// URL builders — puros, testáveis, usados por RSC e client components.
// -----------------------------------------------------------------------------

/**
 * Serializa filtros em URLSearchParams. Chaves ausentes/vazias NÃO entram —
 * URL fica curta e canônica (importante para SEO e cache).
 */
export function buildProductsQueryString(query: ListProductsQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.brand) params.set('brand', query.brand);
  if (query.species) params.set('species', query.species);
  if (typeof query.minPrice === 'number') params.set('minPrice', String(query.minPrice));
  if (typeof query.maxPrice === 'number') params.set('maxPrice', String(query.maxPrice));
  if (query.available === true) params.set('available', 'true');
  if (query.sort && query.sort !== 'newest') params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.limit && query.limit !== 20) params.set('limit', String(query.limit));
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** Lê filtros a partir de `URLSearchParams` — inverso de `buildProductsQueryString`. */
export function parseProductsQuery(sp: URLSearchParams | Record<string, string | string[] | undefined>): ListProductsQuery {
  const get = (k: string): string | undefined => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const asNumber = (v: string | undefined): number | undefined => {
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const sortRaw = get('sort');
  const validSorts: Sort[] = [
    'newest',
    'oldest',
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc',
  ];
  const sort: Sort =
    sortRaw && (validSorts as string[]).includes(sortRaw) ? (sortRaw as Sort) : 'newest';

  return {
    search: get('search') || undefined,
    category: get('category') || undefined,
    brand: get('brand') || undefined,
    minPrice: asNumber(get('minPrice')),
    maxPrice: asNumber(get('maxPrice')),
    available: get('available') === 'true' || undefined,
    sort,
    page: asNumber(get('page')) ?? 1,
    limit: asNumber(get('limit')) ?? 20,
  };
}

/**
 * Aplica um patch em cima de filtros atuais. Se `resetPage` é true (default),
 * qualquer mudança que não seja `page` reseta para 1.
 */
export function mergeQuery(
  current: ListProductsQuery,
  patch: Partial<ListProductsQuery>,
  opts: { resetPage?: boolean } = {},
): ListProductsQuery {
  const next: ListProductsQuery = { ...current, ...patch };
  const changedNonPage = Object.keys(patch).some((k) => k !== 'page');
  if ((opts.resetPage ?? true) && changedNonPage) {
    next.page = 1;
  }
  return next;
}
