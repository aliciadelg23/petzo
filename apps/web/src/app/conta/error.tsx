'use client';

import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function ContaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[/conta] boundary:', error);
  }, [error]);

  return (
    <Container className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
      <span aria-hidden className="text-5xl">🙁</span>
      <h2 className="text-2xl font-semibold text-neutral-900">
        Não conseguimos abrir sua conta
      </h2>
      <p className="max-w-md text-neutral-600">
        Isso pode ser uma falha temporária de rede. Tente novamente em alguns instantes.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </Container>
  );
}
