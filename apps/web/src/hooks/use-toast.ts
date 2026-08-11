'use client';

import { useContext } from 'react';
import { ToastContext } from '@/providers/toast-provider';

/**
 * Hook consumidor do ToastContext. Falha ruidosamente se usado fora do
 * ToastProvider — é um bug de configuração e queremos crashar cedo.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() precisa estar dentro de <ToastProvider>.');
  }
  return ctx;
}
