'use client';

// CLIENT — obrigatório para error boundary do App Router.
import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[/products/error]', error);
  }, [error]);

  return (
    <Container className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12 text-center">
      <span aria-hidden className="text-5xl">🛠️</span>
      <h2 className="text-2xl font-semibold text-neutral-900">Não conseguimos carregar o catálogo</h2>
      <p className="max-w-md text-neutral-600">
        A API está temporariamente indisponível. Tente novamente em alguns instantes.
      </p>
      {error.digest && (
        <code className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
          ref: {error.digest}
        </code>
      )}
      <Button onClick={reset}>Tentar novamente</Button>
    </Container>
  );
}
