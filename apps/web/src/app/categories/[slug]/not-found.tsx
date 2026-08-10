import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-12 text-center">
      <span aria-hidden className="text-5xl">📂</span>
      <h2 className="text-2xl font-semibold text-neutral-900">Categoria não encontrada</h2>
      <Link href="/products">
        <Button>Ver todos os produtos</Button>
      </Link>
    </Container>
  );
}
