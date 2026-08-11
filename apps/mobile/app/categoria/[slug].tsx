import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import { useProductsQuery } from '@/features/catalog/hooks';
import { colors, spacing } from '@/lib/colors';

export default function CategoriaScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useProductsQuery({ category: slug, limit: 30 });

  return (
    <ScreenContainer scroll={false} padded>
      {q.isPending ? (
        <Text style={styles.muted}>Carregando…</Text>
      ) : q.isError ? (
        <Text style={styles.error}>Falha ao carregar categoria.</Text>
      ) : (
        <FlatList
          data={q.data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm }}
          ListEmptyComponent={<Text style={styles.muted}>Nenhum produto nesta categoria.</Text>}
          renderItem={({ item }) => (
            <Link href={`/produto/${item.slug}`} asChild>
              <Pressable style={styles.card}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0].url }} style={styles.img} />
                ) : (
                  <View style={[styles.img, styles.placeholder]}>
                    <Text style={{ fontSize: 24 }}>🐾</Text>
                  </View>
                )}
                <Text numberOfLines={2} style={styles.name}>
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
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
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
});
