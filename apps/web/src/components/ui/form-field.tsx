import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Envelope padrão de campo de formulário:
 *   <label> + input (children) + hint opcional + mensagem de erro.
 *
 * RSC-friendly — nenhum evento aqui. Ideal para composição:
 *
 *   <FormField label="Email" error={errors.email?.message}>
 *     <Input {...register('email')} aria-invalid={!!errors.email} />
 *   </FormField>
 *
 * Substitui a duplicação vista em login-form, register-form e checkout.
 */
interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wide text-neutral-600"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
