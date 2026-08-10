import { useLocalSearchParams, Link } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import { Button } from '@/components/Button';
import { useProductsQuery } from '@/features/catalog/hooks';
import type { Species } from '@/features/catalog/api';
import { colors, spacing } from '@/lib/colors';

export default function ProdutosScreen() {
  const { species } = useLocalSearchParams<{ species?: Species }>();
  const q = useProductsQuery({ species, limit: 20 });

  return (
    <ScreenContainer scroll={false} padded>
      <View style={styles.header}>
        <Text style={styles.title}>Produtos</Text>
        <Link href="/busca" asChild>
          <Button title="Buscar" size="sm" variant="outline" />
        </Link>
      </View>

      {q.isPending ? (
        <Text style={styles.muted}>Carregando…</Text>
      ) : q.isError ? (
        <Text style={styles.error}>Falha ao carregar produtos.</Text>
      ) : q.data && q.data.items.length === 0 ? (
        <Text style={styles.muted}>Nenhum produto encontrado.</Text>
      ) : (
        <FlatList
          data={q.data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing['2xl'] }}
          renderItem={({ item }) => (
            <Link href={`/produto/${item.slug}`} asChild>
              <Pressable style={styles.card}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0].url }} style={styles.img} />
                ) : (
                  <View style={[styles.img, styles.placeholder]}>
                    <Text style={{ fontSize: 32 }}>🐾</Text>
                  </View>
                )}
                <Text numberOfLines={2} style={styles.name}>
                  {item.name}
                </Text>
                <PriceTag cents={item.price} size="sm" />
                {!item.available && <Text style={styles.stock}>Esgotado</Text>}
              </Pressable>
            </Link>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.neutral900 },
  muted: { color: colors.neutral500, textAlign: 'center', marginTop: spacing.xl },
  error: { color: colors.red600, textAlign: 'center', marginTop: spacing.xl },
  card: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  img: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.neutral100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 12, color: colors.neutral800, marginTop: 6, marginBottom: 4 },
  stock: { color: colors.red600, fontSize: 11, marginTop: 4 },
});
