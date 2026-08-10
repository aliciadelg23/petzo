'use client';

// CLIENT — consome hook (React Query).
// Renderiza um badge com o status da API. Enquanto a API não sobe, mostra "offline".

import { useHealthQuery } from '../hooks';
import { cn } from '@/lib/utils';

export function ApiStatusBadge({ className }: { className?: string }) {
  const { data, isPending, isError } = useHealthQuery();

  const state: 'loading' | 'online' | 'offline' = isPending
    ? 'loading'
    : isError
      ? 'offline'
      : 'online';

  const label: Record<typeof state, string> = {
    loading: 'Verificando API...',
    online: `API online${data?.version ? ` — v${data.version}` : ''}`,
    offline: 'API offline',
  };

  const dot: Record<typeof state, string> = {
    loading: 'bg-neutral-400 animate-pulse',
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden className={cn('h-2 w-2 rounded-full', dot[state])} />
      {label[state]}
    </span>
  );
}
