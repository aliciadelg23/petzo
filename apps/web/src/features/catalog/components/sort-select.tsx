'use client';

// CLIENT — <select> nativo (acessível e leve).

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SORT_LABELS, buildProductsQueryString, mergeQuery, parseProductsQuery } from '../lib';
import type { Sort } from '../types';
import { cn } from '@/lib/utils';

const OPTIONS: Sort[] = [
  'newest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
  'oldest',
];

export function SortSelect({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const currentSort = parseProductsQuery(new URLSearchParams(sp.toString())).sort ?? 'newest';

  const onChange = (value: string) => {
    const current = parseProductsQuery(new URLSearchParams(sp.toString()));
    const next = mergeQuery(current, { sort: value as Sort });
    router.replace(`${pathname}${buildProductsQueryString(next)}`, { scroll: false });
  };

  return (
    <label className={cn('flex items-center gap-2 text-sm text-neutral-700', className)}>
      <span>Ordenar:</span>
      <select
        aria-label="Ordenar produtos"
        className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        value={currentSort}
        onChange={(e) => onChange(e.target.value)}
      >
        {OPTIONS.map((v) => (
          <option key={v} value={v}>
            {SORT_LABELS[v]}
          </option>
        ))}
      </select>
    </label>
  );
}
