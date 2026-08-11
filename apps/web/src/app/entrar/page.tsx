// RSC-shell (renderiza título + link) que embute LoginForm (client) como ilha.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta Petzo.',
};

export default function EntrarPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-bold text-neutral-900">Entrar</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Novo por aqui?{' '}
        <Link href="/cadastrar" className="text-brand-600 underline underline-offset-2">
          Criar conta
        </Link>
        .
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </Container>
  );
}
