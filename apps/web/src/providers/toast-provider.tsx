'use client';

/**
 * Context de feedback ephemeral (toasts).
 *
 * Por que Context (e não Zustand nem TanStack Query)?
 *
 *   - Toasts são estado GLOBAL simples e efêmero (não é server state).
 *   - TanStack Query é para server state — não faz sentido.
 *   - Zustand seria overkill: 1 API pública, 1 consumidor (o hook `useToast`).
 *     Context serve exatamente o padrão "provider no root + hook consumidor".
 *   - Re-renders: o consumer é o próprio <ToastContainer />, então mudanças
 *     no toast state só re-renderizam a UI que precisa (aceitável).
 *
 * Contrato:
 *   const { toast } = useToast()
 *   toast({ kind: 'success', message: 'Adicionado ao carrinho.' })
 */
import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  /** ms até auto-dismiss. Default: 4000. */
  durationMs?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `t${++counter.current}`;
      const durationMs = t.durationMs ?? 4000;
      setToasts((prev) => [...prev, { ...t, id }]);
      // auto dismiss
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  // `useMemo` no value: sem ele, todo re-render deste provider (pai da árvore
  // toda) invalidaria o context para TODOS os consumers com `useContext`.
  // `toast`/`dismiss` já são estáveis (useCallback), então o value só muda
  // quando `toasts` muda — que é o comportamento desejado.
  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
