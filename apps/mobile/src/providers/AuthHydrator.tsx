import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { getRefreshToken, saveRefreshToken } from '@/features/auth/secure-store';
import { env } from '@/config/env';

/**
 * Boot: se existe refresh no SecureStore, tenta trocar por access.
 * Sucesso → sessão hidratada; falha → hidratado sem sessão (usuário vê tela de auth).
 */
export function AuthHydrator() {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) return;
    let alive = true;
    (async () => {
      const token = await getRefreshToken();
      if (!token) {
        if (alive) setHydrated(true);
        return;
      }
      try {
        const res = await fetch(`${env.apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: { Accept: 'application/json', Cookie: `petzo_refresh=${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (alive) setSession({ user: data.user, accessToken: data.accessToken });
          const setCookie = res.headers.get('set-cookie');
          if (setCookie) {
            const m = setCookie.match(/petzo_refresh=([^;]+)/);
            if (m?.[1]) await saveRefreshToken(m[1]);
          }
        }
      } catch {
        // silencioso — fica sem sessão
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, setSession, setHydrated]);

  return null;
}
