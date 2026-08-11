// @vitest-environment jsdom
/**
 * Helper de render com Providers necessários para componentes que consomem
 * TanStack Query.
 *
 * Nota sobre types: `@testing-library/react@16` carrega `@types/react@18`
 * transitivamente, mas o workspace tem `@types/react@19`. As duas cópias do
 * tipo `ReactNode` são "estruturalmente idênticas" mas não são a mesma
 * identidade nominal, então o TS reclama. Usamos um cast estreito no ponto
 * de fronteira — sem impacto em runtime.
 */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function renderWithProviders(
  ui: ReactElement,
  options?: Options,
): RenderResult & { queryClient: QueryClient } {
  const qc = options?.queryClient ?? createTestQueryClient();
  const Wrapper: any = ({ children }: { children: unknown }) => (
    <QueryClientProvider client={qc}>{children as any}</QueryClientProvider>
  );
  const result = render(ui as any, { wrapper: Wrapper, ...options });
  return Object.assign(result, { queryClient: qc });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
