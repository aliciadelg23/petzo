'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { registerFormSchema, type RegisterFormValues } from '../schemas';
import { useRegisterMutation } from '../hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/hooks/use-toast';
import { HttpError } from '@/lib/errors';

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync(values);
      toast({ kind: 'success', message: 'Conta criada.' });
      router.replace('/conta');
    } catch (err) {
      if (HttpError.isHttpError(err) && err.status === 409) {
        // Erros de campo específico ficam no próprio campo (é onde o usuário
        // olha para corrigir); erros globais viram toast.
        setError('email', { message: 'Este email já está cadastrado.' });
      } else {
        toast({ kind: 'error', message: 'Não foi possível criar sua conta agora.' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Nome" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Senha"
        htmlFor="password"
        error={errors.password?.message}
        hint="Ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}
