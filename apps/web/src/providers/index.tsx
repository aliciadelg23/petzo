'use client';

// CLIENT — barrel único importado pelo RootLayout (RSC) para injetar
// todos os providers do client em uma única árvore de contexto.

import type { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { AuthHydrator } from '@/features/auth/components/auth-hydrator';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthHydrator />
      {children}
    </QueryProvider>
  );
}
