'use client';

// CLIENT — barrel único importado pelo RootLayout (RSC) para injetar
// todos os providers do client em uma única árvore de contexto.

import type { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';
import { AuthHydrator } from '@/features/auth/components/auth-hydrator';
import { ToastContainer } from '@/components/ui/toast-container';

/**
 * Ordem escolhida:
 * 1. QueryProvider — mais externo; hydration da sessão pode disparar queries.
 * 2. ToastProvider — precisa envolver TODA a app (mutations em qualquer nível
 *    devem poder chamar toast). Pouco custo — só re-renderiza consumers em push/dismiss.
 * 3. AuthHydrator — ativa /auth/refresh no boot (não é provider, é side-effect).
 * 4. ToastContainer — vive AO LADO dos children, dentro do provider, para
 *    consumir o contexto.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthHydrator />
        {children}
        <ToastContainer />
      </ToastProvider>
    </QueryProvider>
  );
}
