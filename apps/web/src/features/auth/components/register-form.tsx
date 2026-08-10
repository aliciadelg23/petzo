'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { registerFormSchema, type RegisterFormValues } from '../schemas';
import { useRegisterMutation } from '../hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HttpError } from '@/lib/errors';

export function RegisterForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const mutation = useRegisterMutation();

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await mutation.mutateAsync(values);
      router.replace('/conta');
    } catch (err) {
      if (HttpError.isHttpError(err) && err.status === 409) {
        setError('email', { message: 'Este email já está cadastrado.' });
      } else {
        setError('root', { message: 'Não foi possível criar sua conta agora.' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-neutral-800">
          Nome
        </label>
        <Input id="name" aria-invalid={!!errors.name} autoComplete="name" {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

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
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        <p className="text-xs text-neutral-500">
          Ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.
        </p>
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}
