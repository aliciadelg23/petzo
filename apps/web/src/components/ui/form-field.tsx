'use client';

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Envelope padrão de campo de formulário:
 *   <label> + input (children) + hint opcional + mensagem de erro.
 *
 *   <FormField label="Email" error={errors.email?.message}>
 *     <Input {...register('email')} />
 *   </FormField>
 *
 * A11y automatizada:
 *   - Gera `id` estável via `useId` e o injeta no elemento filho.
 *   - `label` recebe `htmlFor` correspondente (permite focar clicando no rótulo).
 *   - Filho recebe `aria-invalid` quando há `error`, e `aria-describedby`
 *     apontando para o hint (padrão) ou para o erro (quando presente).
 *   - Parágrafo de erro carrega `role="alert"` para leitores anunciarem.
 *
 * Substitui a duplicação vista em login-form, register-form e checkout.
 */
interface FormFieldProps {
  label: string;
  /** Se fornecido, sobrescreve o id gerado (útil para campos externos). */
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

// Props que injetamos no filho — não `any` puro para manter checagem.
type A11yInjected = {
  id?: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
};

export function FormField({ label, htmlFor, hint, error, children, className }: FormFieldProps) {
  const autoId = useId();
  const inputId = htmlFor ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  // Se o filho for um único elemento válido, injetamos id + aria.
  // Caso contrário (fragmento, texto), preservamos o comportamento antigo.
  const enhancedChildren = isValidElement(children)
    ? cloneElement(children as ReactElement<A11yInjected>, {
        id: (children as ReactElement<A11yInjected>).props.id ?? inputId,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })
    : children;

  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={inputId}
        className="block text-xs font-medium uppercase tracking-wide text-neutral-600"
      >
        {label}
      </label>
      {enhancedChildren}
      {hint && !error && (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
