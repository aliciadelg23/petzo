'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[/admin] boundary:', error);
  }, [error]);
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <span aria-hidden className="text-4xl">⚙️</span>
      <h2 className="text-xl font-semibold text-neutral-900">Erro no painel administrativo</h2>
      <p className="max-w-md text-sm text-neutral-600">
        Falha ao carregar dados do backend. Tente novamente.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
