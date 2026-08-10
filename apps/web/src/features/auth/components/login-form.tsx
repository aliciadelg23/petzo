'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginFormSchema, type LoginFormValues } from '../schemas';
import { useLoginMutation } from '../hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HttpError } from '@/lib/errors';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') ?? '/conta';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useLoginMutation();

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await mutation.mutateAsync(values);
      router.replace(redirect);
    } catch (err) {
      if (HttpError.isHttpError(err) && err.status === 401) {
        setError('root', { message: 'Email ou senha incorretos.' });
      } else {
        setError('root', { message: 'Não foi possível entrar. Tente novamente.' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-800">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-neutral-800">
          Senha
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
