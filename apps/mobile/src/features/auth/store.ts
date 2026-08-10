import { create } from 'zustand';

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
  setSession: (s: { user: AuthUser; accessToken: string }) => void;
  clearSession: () => void;
  setHydrated: (v: boolean) => void;
}

/**
 * Access token e user vivem em MEMÓRIA (Zustand sem persist).
 * Refresh token vive em Expo SecureStore (Keychain iOS / Keystore Android) —
 * ver src/features/auth/secure-store.ts.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
  setHydrated: (v) => set({ hydrated: v }),
}));
