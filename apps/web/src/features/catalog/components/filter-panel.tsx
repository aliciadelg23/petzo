'use client';

/**
 * CLIENT — filtros: categoria, marca, preço, disponibilidade.
 *
 * Escolhas defensáveis:
 * - `useCatalogUrlState` — URL como única fonte da verdade dos filtros.
 * - `useState` LOCAL para o par (minPrice, maxPrice) do input — evita URL push
 *   a cada keystroke em campo numérico (aplicar via botão "Aplicar"). Este é
 *   um caso de "controlled input com commit explícito", diferente do search.
 * - `useEffect` sincroniza o input local quando a URL muda externamente.
 */
import { useEffect, useState } from 'react';
import { useCatalogUrlState } from '../use-catalog-url-state';
import type { Brand, Category } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
  categories: Category[];
  brands: Brand[];
}

export function FilterPanel({ categories, brands }: Props) {
  const { query, patch } = useCatalogUrlState();

  const [minPrice, setMinPrice] = useState<string>(
    query.minPrice !== undefined ? String(query.minPrice / 100) : '',
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    query.maxPrice !== undefined ? String(query.maxPrice / 100) : '',
  );

  useEffect(() => {
    setMinPrice(query.minPrice !== undefined ? String(query.minPrice / 100) : '');
    setMaxPrice(query.maxPrice !== undefined ? String(query.maxPrice / 100) : '');
  }, [query.minPrice, query.maxPrice]);

  const applyPrice = () => {
    const min = minPrice.trim() ? Math.round(Number(minPrice) * 100) : undefined;
    const max = maxPrice.trim() ? Math.round(Number(maxPrice) * 100) : undefined;
    patch({
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
              className={`text-sm ${query.category ? 'text-neutral-500' : 'font-medium text-brand-600'}`}
              onClick={() => patch({ category: undefined })}
            >
              Todas
            </button>
          </li>
          {rootCategories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`text-sm ${
                  query.category === c.slug ? 'font-medium text-brand-600' : 'text-neutral-700'
                }`}
                onClick={() => patch({ category: c.slug })}
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
                            query.category === sub.slug
                              ? 'font-medium text-brand-600'
                              : 'text-neutral-600'
                          }`}
                          onClick={() => patch({ category: sub.slug })}
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
              className={`text-sm ${query.brand ? 'text-neutral-500' : 'font-medium text-brand-600'}`}
              onClick={() => patch({ brand: undefined })}
            >
              Todas
            </button>
          </li>
          {brands.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className={`text-sm ${
                  query.brand === b.slug ? 'font-medium text-brand-600' : 'text-neutral-700'
                }`}
                onClick={() => patch({ brand: b.slug })}
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
            checked={query.available === true}
            onChange={(e) => patch({ available: e.target.checked || undefined })}
          />
          Apenas disponíveis
        </label>
      </section>

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => patch({
          search: undefined,
          category: undefined,
          brand: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          available: undefined,
        })}
      >
        Limpar filtros
      </Button>
    </aside>
  );
}
