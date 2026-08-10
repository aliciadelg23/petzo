import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { UserMenu } from '@/features/auth/components/user-menu';

// RSC — sem interatividade. UserMenu é ilha CLIENT isolada.

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/products', label: 'Produtos' },
  { href: '/sobre', label: 'Sobre' },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-neutral-900">
          <span aria-hidden className="text-2xl">🐾</span>
          <span>Petzo</span>
        </Link>
        <nav aria-label="Navegação principal">
          <ul className="flex items-center gap-6 text-sm text-neutral-700">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link className="transition-colors hover:text-brand-600" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <UserMenu />
      </Container>
    </header>
  );
}
