'use client';

// CLIENT — a página em si é client porque consome o store da sessão.
// Alternativa: RSC + fetch server-side com o cookie. Deixamos client aqui para
// manter o padrão "web só chama API via HTTP a partir do browser".

import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuthStore } from '@/features/auth/store';

export default function ContaPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Minha conta</h1>
      <p className="mt-2 text-neutral-600">
        Bem-vindo, <span className="font-medium text-neutral-900">{user.name}</span>.
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <dt className="text-xs uppercase text-neutral-500">Email</dt>
          <dd className="mt-1 text-sm text-neutral-900">{user.email}</dd>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <dt className="text-xs uppercase text-neutral-500">Perfil</dt>
          <dd className="mt-1 text-sm text-neutral-900">{user.role}</dd>
        </div>
      </dl>

      <div className="mt-8 space-y-2 text-sm">
        <p className="text-neutral-600">Em breve:</p>
        <ul className="list-disc pl-5 text-neutral-700">
          <li>
            <Link href="#" className="hover:text-brand-600">
              Meus pedidos
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-brand-600">
              Meus pets
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-brand-600">
              Endereços
            </Link>
          </li>
        </ul>
      </div>
    </Container>
  );
}
