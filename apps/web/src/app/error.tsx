'use client';

// CLIENT — error boundaries são obrigatoriamente Client Components no App Router.
// Recebe `reset()` para tentar re-renderizar o segmento.

import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { HttpError } from '@/lib/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, enviar para observabilidade (Sentry, etc.). Por ora, log.
    console.error('[app/error] boundary caught:', error);
  }, [error]);

  const isNotFound = HttpError.isHttpError(error) && error.status === 404;

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span aria-hidden className="text-6xl">💥</span>
      <h2 className="text-2xl font-semibold text-neutral-900">
        {isNotFound ? 'Recurso não encontrado' : 'Algo deu errado'}
      </h2>
      <p className="max-w-md text-neutral-600">
        {error.message || 'Um erro inesperado aconteceu. Tente novamente em alguns instantes.'}
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
