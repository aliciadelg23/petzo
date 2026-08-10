// RSC — placeholder para o catálogo. Consumo real da API virá em fase futura.
import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Loja',
  description: 'Explore o catálogo Petzo — em breve.',
};

export default function LojaPage() {
  return (
    <Container className="py-16">
      <h1 className="text-3xl font-bold text-neutral-900">Loja</h1>
      <p className="mt-4 text-neutral-600">
        O catálogo será implementado em uma próxima etapa, consumindo{' '}
        <code className="rounded bg-neutral-100 px-1">GET /products</code> da API REST em{' '}
        <code className="rounded bg-neutral-100 px-1">apps/api</code>.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
        Catálogo em construção 🚧
      </div>
    </Container>
  );
}
