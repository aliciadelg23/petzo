import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta Petzo.',
};

export default function CadastrarPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-bold text-neutral-900">Criar conta</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-brand-600 underline underline-offset-2">
          Entrar
        </Link>
        .
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </Container>
  );
}
