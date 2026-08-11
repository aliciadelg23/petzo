import { Link } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import { useProductsQuery } from '@/features/catalog/hooks';
import { useAuthStore } from '@/features/auth/store';
import { colors, spacing } from '@/lib/colors';

const CATEGORIES: { icon: string; label: string; species?: 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' }[] = [
  { icon: '🐕', label: 'Cães', species: 'DOG' },
  { icon: '🐈', label: 'Gatos', species: 'CAT' },
  { icon: '🐇', label: 'Coelhos', species: 'RABBIT' },
  { icon: '🐦', label: 'Aves', species: 'BIRD' },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const featured = useProductsQuery({ limit: 8, sort: 'newest' });

  return (
    <ScreenContainer>
      <Text style={styles.hello}>Olá, {user?.name.split(' ')[0] ?? 'você'} 🐾</Text>
      <Text style={styles.tagline}>Tudo o que seu pet precisa, num só lugar.</Text>

      <Text style={styles.sectionTitle}>Categorias</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => (
          <Link
            key={c.label}
            href={{ pathname: '/(tabs)/produtos', params: c.species ? { species: c.species } : {} }}
            asChild
          >
            <Pressable style={styles.categoryCard}>
              <Text style={styles.categoryIcon}>{c.icon}</Text>
              <Text style={styles.categoryLabel}>{c.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Novidades</Text>
      {featured.isPending ? (
        <Text style={styles.muted}>Carregando…</Text>
      ) : featured.isError ? (
        <Text style={styles.error}>Não foi possível carregar.</Text>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={featured.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <Link href={`/produto/${item.slug}`} asChild>
              <Pressable style={styles.productCard}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0].url }} style={styles.productImg} />
                ) : (
                  <View style={[styles.productImg, styles.placeholder]}>
                    <Text style={{ fontSize: 32 }}>🐾</Text>
                  </View>
                )}
                <Text numberOfLines={2} style={styles.productName}>
                  {item.name}
                </Text>
                <PriceTag cents={item.price} size="sm" />
              </Pressable>
            </Link>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 22, fontWeight: '700', color: colors.neutral900 },
  tagline: { color: colors.neutral600, marginTop: 4, marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral900,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  categoryCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  categoryIcon: { fontSize: 28 },
  categoryLabel: { fontWeight: '600', color: colors.neutral900, marginTop: 4 },
  productCard: {
    width: 160,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  productImg: { width: '100%', height: 100, borderRadius: 8, backgroundColor: colors.neutral100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 12, color: colors.neutral800, marginTop: 6, marginBottom: 4 },
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
});
