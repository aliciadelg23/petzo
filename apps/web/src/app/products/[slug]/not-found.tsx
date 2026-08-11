import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-12 text-center">
      <span aria-hidden className="text-5xl">🔎</span>
      <h2 className="text-2xl font-semibold text-neutral-900">Produto não encontrado</h2>
      <p className="max-w-md text-neutral-600">
        O produto que você tentou acessar não existe ou saiu do catálogo.
      </p>
      <Link href="/products">
        <Button>Voltar para produtos</Button>
      </Link>
    </Container>
  );
}
