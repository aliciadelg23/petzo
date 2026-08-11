import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/features/auth/store';
import { useLogoutMutation } from '@/features/auth/hooks';
import { colors, spacing } from '@/lib/colors';

const LINKS: { href: '/pedidos' | '/pets' | '/favoritos'; label: string; icon: string }[] = [
  { href: '/pedidos', label: 'Meus pedidos', icon: '📦' },
  { href: '/pets', label: 'Meus pets', icon: '🐾' },
  { href: '/favoritos', label: 'Favoritos', icon: '❤️' },
];

export default function PerfilScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogoutMutation();

  if (!user) return null;

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>{user.role}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} asChild>
            <Pressable style={styles.menuItem}>
              <Text style={styles.menuIcon}>{l.icon}</Text>
              <Text style={styles.menuLabel}>{l.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Button
        title={logout.isPending ? 'Saindo…' : 'Sair'}
        variant="outline"
        loading={logout.isPending}
        onPress={async () => {
          await logout.mutateAsync();
          router.replace('/(auth)/entrar');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.neutral900 },
  email: { color: colors.neutral500, marginTop: 4 },
  roleTag: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.brand50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleText: { color: colors.brand700, fontSize: 11, fontWeight: '600' },
  menu: { gap: spacing.sm, marginBottom: spacing.lg },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, color: colors.neutral900, fontWeight: '500' },
  chevron: { color: colors.neutral400, fontSize: 20 },
});
