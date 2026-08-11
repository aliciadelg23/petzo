// Layout admin — protege TODAS as sub-rotas com AuthGuard exigindo STAFF ou ADMIN.
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/container';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { AdminNav } from '@/features/admin/components/admin-nav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowRoles={['ADMIN', 'STAFF']}>
      <Container className="py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">Admin</h1>
          <p className="text-sm text-neutral-500">Painel operacional (STAFF/ADMIN)</p>
        </header>
        <AdminNav />
        <div className="mt-6">{children}</div>
      </Container>
    </AuthGuard>
  );
}
