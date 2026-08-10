'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Dashboard', match: (p: string) => p === '/admin' },
  { href: '/admin/orders', label: 'Pedidos', match: (p: string) => p.startsWith('/admin/orders') },
  { href: '/admin/products', label: 'Produtos', match: (p: string) => p.startsWith('/admin/products') },
  { href: '/admin/categories', label: 'Categorias', match: (p: string) => p.startsWith('/admin/categories') },
  { href: '/admin/inventory', label: 'Estoque', match: (p: string) => p.startsWith('/admin/inventory') },
  { href: '/admin/customers', label: 'Clientes', match: (p: string) => p.startsWith('/admin/customers') },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação administrativa"
      className="flex flex-wrap gap-1 border-b border-neutral-200 pb-2"
    >
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              active
                ? 'bg-brand-100 text-brand-700'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-brand-600',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
