'use client';

// CLIENT — consumidor do ToastContext. Renderizado uma vez no root.

import { useContext } from 'react';
import { ToastContext } from '@/providers/toast-provider';
import { cn } from '@/lib/utils';

const KIND_CLASSES = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-neutral-900 text-white',
} as const;

export function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div
      role="region"
      aria-label="Notificações"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {ctx.toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start justify-between gap-3 rounded-md px-4 py-3 shadow-lg',
            KIND_CLASSES[t.kind],
          )}
        >
          <p className="text-sm">{t.message}</p>
          <button
            type="button"
            onClick={() => ctx.dismiss(t.id)}
            aria-label="Fechar notificação"
            className="text-lg leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
