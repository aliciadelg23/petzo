// RSC — 404 estática.
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span aria-hidden className="text-6xl">🐾</span>
      <h2 className="text-2xl font-semibold text-neutral-900">Página não encontrada</h2>
      <p className="max-w-md text-neutral-600">
        A rota que você tentou acessar não existe (ainda). Volte para a home e continue explorando.
      </p>
      <Link href="/">
        <Button>Voltar para a home</Button>
      </Link>
    </Container>
  );
}
