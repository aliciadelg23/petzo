'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store';
import { useLogoutMutation } from '../hooks';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const logout = useLogoutMutation();

  if (!hydrated) {
    return <span className="text-xs text-neutral-400">…</span>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/entrar" className="text-neutral-700 transition-colors hover:text-brand-600">
          Entrar
        </Link>
        <Link href="/cadastrar">
          <Button size="sm">Criar conta</Button>
        </Link>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.replace('/');
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/conta" className="text-neutral-700 transition-colors hover:text-brand-600">
        Olá, {user.name.split(' ')[0]}
      </Link>
      <Button size="sm" variant="outline" onClick={handleLogout} disabled={logout.isPending}>
        Sair
      </Button>
    </div>
  );
}
