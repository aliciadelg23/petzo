import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/components/auth-guard';

export default function CartLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
