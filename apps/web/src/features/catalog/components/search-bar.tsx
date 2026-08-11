'use client';

/**
 * CLIENT — busca do catálogo.
 *
 * Escolhas defensáveis:
 * - `useState` local para o valor imediato do input (controlled component).
 * - `useDebouncedValue` (custom hook) para separar o valor "que o usuário digita"
 *   do valor "que dispara a URL push" — evita 1 request por keystroke.
 * - `useCatalogUrlState` (custom hook) elimina a duplicação de derivar/atualizar
 *   filtros a partir de searchParams.
 * - `useEffect` faz a ponte debounced-value → URL, e sincroniza input quando a
 *   URL muda externamente (ex.: usuário clica em outra categoria e o SearchBar
 *   deve espelhar o novo termo se houver).
 */
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useCatalogUrlState } from '../use-catalog-url-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const DEBOUNCE_MS = 300;

export function SearchBar() {
  const { query, patch } = useCatalogUrlState();
  const urlSearch = query.search ?? '';

  const [value, setValue] = useState(urlSearch);
  const debounced = useDebouncedValue(value, DEBOUNCE_MS);

  // Sincroniza quando a URL muda externamente (ex.: link direto ou reset)
  useEffect(() => {
    setValue(urlSearch);
  }, [urlSearch]);

  // Propaga debounced → URL. Só chama patch quando o debounced diverge da URL.
  useEffect(() => {
    if (debounced === urlSearch) return;
    patch({ search: debounced.trim() || undefined });
  }, [debounced, urlSearch, patch]);

  return (
    <div className="relative">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar
      </label>
      <Input
        id="catalog-search"
        type="search"
        placeholder="Buscar produtos…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
