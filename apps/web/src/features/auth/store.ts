import { create } from 'zustand';

/**
 * Zustand store da sessão.
 *
 * Access token e user vivem SÓ na memória do processo do browser (não em
 * localStorage/sessionStorage) — em caso de XSS o atacante roda no runtime da
 * página mas não persiste após F5. O refresh token vive em cookie httpOnly
 * gerenciado pela API, então JS nunca acessa.
 *
 * `hydrated` é ligado depois que <AuthHydrator/> tenta `/auth/refresh` no boot.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  emailVerifiedAt: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;

  setSession: (session: { user: AuthUser; accessToken: string }) => void;
  clearSession: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,

  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
  setHydrated: (v) => set({ hydrated: v }),
}));

export const authSelectors = {
  isAuthenticated: (s: AuthState) => s.user !== null,
  user: (s: AuthState) => s.user,
  accessToken: (s: AuthState) => s.accessToken,
  hydrated: (s: AuthState) => s.hydrated,
};
