'use client';

// CLIENT — usa TanStack Query da cart. Aparece só quando user está autenticado.

import Link from 'next/link';
import { useCartQuery } from '../hooks';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils';

export function CartBadge({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const { data } = useCartQuery();

  if (!user) return null;
  const count = data?.itemCount ?? 0;

  return (
    <Link
      href="/carrinho"
      className={cn('relative flex items-center gap-1 text-sm text-neutral-700 hover:text-brand-600', className)}
      aria-label={`Ver carrinho${count > 0 ? ` (${count} itens)` : ''}`}
    >
      <span aria-hidden className="text-xl">🛒</span>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
