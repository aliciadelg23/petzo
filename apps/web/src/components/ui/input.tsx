import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// RSC-friendly — apenas markup. Consumidores clientes lidam com eventos.
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900',
        'placeholder:text-neutral-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:bg-neutral-100',
        'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:ring-red-500',
        className,
      )}
      {...props}
    />
  );
}
