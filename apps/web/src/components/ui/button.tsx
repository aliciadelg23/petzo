import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// RSC-friendly: nada de handlers, useState ou event. Só marcação estilizada.
// Handlers devem ser adicionados em Client Components que consomem este botão.

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-400',
  outline:
    'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 disabled:opacity-50',
  ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-100 disabled:opacity-50',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
