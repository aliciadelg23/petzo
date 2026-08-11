'use client';

// CLIENT — <select> nativo (acessível e leve).

import { SORT_LABELS } from '../lib';
import type { Sort } from '../types';
import { useCatalogUrlState } from '../use-catalog-url-state';
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
  const { query, patch } = useCatalogUrlState();
  const currentSort = query.sort ?? 'newest';

  return (
    <label className={cn('flex items-center gap-2 text-sm text-neutral-700', className)}>
      <span>Ordenar:</span>
      <select
        aria-label="Ordenar produtos"
        className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        value={currentSort}
        onChange={(e) => patch({ sort: e.target.value as Sort })}
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
