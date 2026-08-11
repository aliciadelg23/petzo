'use client';

/**
 * CLIENT — form de login.
 *
 * Escolhas defensáveis:
 * - RHF + zodResolver: forms são domínio de RHF; sem reinventar rodinha.
 * - `FormField` (composição): substitui a duplicação label+input+erro.
 * - `useRef<HTMLInputElement>` + `useEffect(() => ref.current?.focus(), [])`:
 *   autofocus no primeiro campo é UX real. `autoFocus` no JSX é anti-pattern
 *   em Next porque pode rodar antes do JS hidratar; ref no efeito garante
 *   focus só após hidratação client.
 * - `useToast()` centraliza feedback de erro (removeu setError('root') local).
 */
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginFormSchema, type LoginFormValues } from '../schemas';
import { useLoginMutation } from '../hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/hooks/use-toast';
import { HttpError } from '@/lib/errors';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') ?? '/conta';
  const { toast } = useToast();
  const login = useLoginMutation();

  const emailRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login.mutateAsync(values);
      router.replace(redirect);
    } catch (err) {
      if (HttpError.isHttpError(err) && err.status === 401) {
        toast({ kind: 'error', message: 'Email ou senha incorretos.' });
      } else {
        toast({ kind: 'error', message: 'Não foi possível entrar. Tente novamente.' });
      }
    }
  };

  const emailReg = register('email');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...emailReg}
          ref={(node) => {
            emailReg.ref(node);
            emailRef.current = node;
          }}
        />
      </FormField>

      <FormField label="Senha" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
