'use client';

/**
 * CLIENT — bloqueia renderização até:
 *   1) `hydrated=true` (evita flicker de "não autenticado" enquanto refresh roda)
 *   2) usuário estar presente no store; se não, redireciona para /entrar.
 *
 * Também aceita roles opcionais (`allowRoles`) para gates STAFF/ADMIN.
 */
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuthStore, type AuthUser } from '../store';

export function AuthGuard({
  children,
  allowRoles,
}: {
  children: ReactNode;
  allowRoles?: AuthUser['role'][];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/entrar?redirect=${redirect}`);
    } else if (allowRoles && !allowRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [hydrated, user, allowRoles, router, pathname]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        Verificando sessão…
      </div>
    );
  }
  if (!user) return null;
  if (allowRoles && !allowRoles.includes(user.role)) return null;

  return <>{children}</>;
}
