import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/features/auth/store';

/**
 * Grupo (auth): se já autenticado, manda para as tabs.
 */
export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) return null;
  if (user) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
