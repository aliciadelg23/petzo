import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes com `clsx` e resolve conflitos do Tailwind com `twMerge`.
 * Uso: `cn('px-2 py-1', condition && 'bg-red-500')`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
