'use client';

// CLIENT — error boundary local do carrinho.
// Recovery real: usuário pode ter perdido conexão ao carregar cart;
// botão `reset()` retenta apenas o segmento (não a app inteira).

import { useEffect } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[/carrinho] boundary:', error);
  }, [error]);

  return (
    <Container className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
      <span aria-hidden className="text-5xl">🛒</span>
      <h2 className="text-2xl font-semibold text-neutral-900">
        Não conseguimos abrir seu carrinho
      </h2>
      <p className="max-w-md text-neutral-600">
        Falha temporária de comunicação com a API. Tente novamente.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </Container>
  );
}
