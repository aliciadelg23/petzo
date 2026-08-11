'use client';

// CLIENT — filtros: categoria, marca, preço, disponibilidade.

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { buildProductsQueryString, mergeQuery, parseProductsQuery } from '../lib';
import type { Brand, Category } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
  categories: Category[];
  brands: Brand[];
}

export function FilterPanel({ categories, brands }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = parseProductsQuery(new URLSearchParams(sp.toString()));

  // Preço tem UX de "aplicar" (evita URL churn durante digitação)
  const [minPrice, setMinPrice] = useState<string>(
    current.minPrice !== undefined ? String(current.minPrice / 100) : '',
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    current.maxPrice !== undefined ? String(current.maxPrice / 100) : '',
  );

  useEffect(() => {
    setMinPrice(current.minPrice !== undefined ? String(current.minPrice / 100) : '');
    setMaxPrice(current.maxPrice !== undefined ? String(current.maxPrice / 100) : '');
  }, [current.minPrice, current.maxPrice]);

  const push = (patch: Parameters<typeof mergeQuery>[1]) => {
    const next = mergeQuery(current, patch);
    router.replace(`${pathname}${buildProductsQueryString(next)}`, { scroll: false });
  };

  const applyPrice = () => {
    const min = minPrice.trim() ? Math.round(Number(minPrice) * 100) : undefined;
    const max = maxPrice.trim() ? Math.round(Number(maxPrice) * 100) : undefined;
    push({
      minPrice: Number.isFinite(min) ? min : undefined,
      maxPrice: Number.isFinite(max) ? max : undefined,
    });
  };

  const rootCategories = categories.filter((c) => c.parentId === null);

  return (
    <aside className="space-y-6" aria-label="Filtros">
      <section>
        <h3 className="text-sm font-semibold text-neutral-900">Categoria</h3>
        <ul className="mt-2 space-y-1">
          <li>
            <button
              type="button"
              className={`text-sm ${current.category ? 'text-neutral-500' : 'font-medium text-brand-600'}`}
              onClick={() => push({ category: undefined })}
            >
              Todas
            </button>
          </li>
          {rootCategories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`text-sm ${
                  current.category === c.slug ? 'font-medium text-brand-600' : 'text-neutral-700'
                }`}
                onClick={() => push({ category: c.slug })}
              >
                {c.name}
              </button>
              {categories.filter((sub) => sub.parentId === c.id).length > 0 && (
                <ul className="ml-3 mt-1 space-y-1 border-l border-neutral-200 pl-3">
                  {categories
                    .filter((sub) => sub.parentId === c.id)
                    .map((sub) => (
                      <li key={sub.id}>
                        <button
                          type="button"
                          className={`text-xs ${
                            current.category === sub.slug
                              ? 'font-medium text-brand-600'
                              : 'text-neutral-600'
                          }`}
                          onClick={() => push({ category: sub.slug })}
                        >
                          {sub.name}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-900">Marca</h3>
        <ul className="mt-2 space-y-1">
          <li>
            <button
              type="button"
              className={`text-sm ${current.brand ? 'text-neutral-500' : 'font-medium text-brand-600'}`}
              onClick={() => push({ brand: undefined })}
            >
              Todas
            </button>
          </li>
          {brands.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={`text-sm ${
                  current.brand === b.slug ? 'font-medium text-brand-600' : 'text-neutral-700'
                }`}
                onClick={() => push({ brand: b.slug })}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-900">Preço (R$)</h3>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-9 w-24 rounded-md border border-neutral-300 bg-white px-2 text-sm"
            min="0"
          />
          <span aria-hidden className="text-neutral-400">–</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-9 w-24 rounded-md border border-neutral-300 bg-white px-2 text-sm"
            min="0"
          />
        </div>
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={applyPrice}>
          Aplicar
        </Button>
      </section>

      <section>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={current.available === true}
            onChange={(e) => push({ available: e.target.checked || undefined })}
          />
          Apenas disponíveis
        </label>
      </section>

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() =>
          router.replace(
            `${pathname}${buildProductsQueryString({ sort: current.sort, page: 1, limit: current.limit })}`,
            { scroll: false },
          )
        }
      >
        Limpar filtros
      </Button>
    </aside>
  );
}
