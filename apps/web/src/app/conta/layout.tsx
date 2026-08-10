// Layout de /conta — envolve todas as sub-rotas com AuthGuard (client).
// A rota em si é RSC — o guard é uma ilha client que decide render/redirect.
import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/components/auth-guard';

export default function ContaLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
