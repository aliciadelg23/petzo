'use client';

// CLIENT — controlado + debounce; propaga para a URL via router.push.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { buildProductsQueryString, mergeQuery, parseProductsQuery } from '../lib';

const DEBOUNCE_MS = 300;

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initial = useMemo(
    () => parseProductsQuery(new URLSearchParams(sp.toString())).search ?? '',
    [sp],
  );
  const [value, setValue] = useState(initial);

  // Se a URL mudar externamente (ex.: clicar em outra categoria), refletir aqui.
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = parseProductsQuery(new URLSearchParams(sp.toString()));
      if ((current.search ?? '') === value) return;
      const next = mergeQuery(current, { search: value.trim() || undefined });
      router.replace(`${pathname}${buildProductsQueryString(next)}`, { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // Deliberadamente sem `sp` na dep — o efeito lê sp no interior sem re-agendar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router]);

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
