'use client';

/**
 * CLIENT — no boot, tenta um /auth/refresh silencioso.
 * O cookie httpOnly de refresh (se ainda válido) permite recuperar sessão sem
 * pedir login de novo.
 *
 * Marcamos `hydrated` no store para downstream components (guards) só
 * decidirem redirect DEPOIS que a tentativa terminou.
 */
import { useEffect } from 'react';
import * as authApi from '../api';
import { useAuthStore } from '../store';

export function AuthHydrator() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) return;
    let alive = true;
    authApi
      .refresh()
      .then((data) => {
        if (!alive) return;
        setSession({ user: data.user, accessToken: data.accessToken });
      })
      .catch(() => {
        if (!alive) return;
        clearSession();
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, [hydrated, setSession, clearSession, setHydrated]);

  return null;
}
