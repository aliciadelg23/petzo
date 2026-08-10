import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/components/auth-guard';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
