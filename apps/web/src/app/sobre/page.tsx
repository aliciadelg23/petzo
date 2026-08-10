// RSC — página estática de "sobre". Sem fetch, sem hooks.
import type { Metadata } from 'next';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Sobre',
  description:
    'Petzo é um projeto de portfólio full-stack construído com Next.js, React Native, Node.js e PostgreSQL.',
};

export default function SobrePage() {
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="text-3xl font-bold text-neutral-900">Sobre a Petzo</h1>
      <div className="mt-6 space-y-4 text-neutral-700">
        <p>
          A Petzo é um projeto de portfólio full-stack cujo objetivo é demonstrar boas práticas de
          engenharia em toda a pilha: React, React Native, TypeScript, Node.js, PostgreSQL,
          autenticação, RBAC, testes, Docker e CI/CD.
        </p>
        <p>
          A mesma API REST é consumida tanto pelo aplicativo web (Next.js) quanto pelo aplicativo
          mobile (React Native / Expo), com tipos e schemas de validação compartilhados via um
          monorepo <code className="rounded bg-neutral-100 px-1">pnpm</code> +{' '}
          <code className="rounded bg-neutral-100 px-1">Turborepo</code>.
        </p>
        <p>
          O back-end segue arquitetura de <strong>Modular Monolith</strong>: um único deploy com
          módulos isolados por domínio (autenticação, catálogo, pedidos, pagamentos), comunicação
          por chamadas diretas entre serviços e persistência em PostgreSQL via Prisma.
        </p>
      </div>
    </Container>
  );
}
