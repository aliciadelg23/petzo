'use client';

// CLIENT — error boundary de checkout.
// Recovery real: se o cart falha ao carregar durante checkout, usuário precisa
// de opção clara para voltar ou tentar de novo.

import { useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[/checkout] boundary:', error);
  }, [error]);

  return (
    <Container className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
      <span aria-hidden className="text-5xl">⚠️</span>
      <h2 className="text-2xl font-semibold text-neutral-900">Erro no checkout</h2>
      <p className="max-w-md text-neutral-600">
        Não conseguimos concluir a operação. Nada foi cobrado — se um pedido foi criado, ele
        aparecerá na sua lista.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href="/carrinho">
          <Button variant="outline">Voltar para o carrinho</Button>
        </Link>
      </div>
    </Container>
  );
}
