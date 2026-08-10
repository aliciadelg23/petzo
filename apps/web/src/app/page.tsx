// RSC — home page. Sem "use client". Todo o conteúdo é estático/RSC exceto
// o <ApiStatusBadge/> (client) que consome o hook do React Query.

import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ApiStatusBadge } from '@/features/health/components/api-status-badge';

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-20">
        <Container className="flex flex-col items-start gap-8">
          <ApiStatusBadge />
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Tudo o que seu pet precisa,{' '}
            <span className="text-brand-600">num só lugar</span>.
          </h1>
          <p className="max-w-xl text-lg text-neutral-700">
            Ração, brinquedos, acessórios, higiene e medicamentos com curadoria de veterinários. Entrega
            rápida em todo o Brasil.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/loja">
              <Button size="lg">Explorar loja</Button>
            </Link>
            <Link href="/sobre">
              <Button size="lg" variant="outline">
                Conheça a Petzo
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <h2 className="mb-8 text-2xl font-semibold text-neutral-900">Categorias em destaque</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: '🐕', label: 'Cães' },
              { icon: '🐈', label: 'Gatos' },
              { icon: '🐇', label: 'Pequenos animais' },
              { icon: '🐠', label: 'Peixes' },
            ].map((cat) => (
              <div
                key={cat.label}
                className="flex flex-col items-start gap-2 rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <span aria-hidden className="text-4xl">
                  {cat.icon}
                </span>
                <p className="font-medium text-neutral-900">{cat.label}</p>
                <p className="text-sm text-neutral-500">Em breve</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
