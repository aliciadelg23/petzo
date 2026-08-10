import { Link } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import {
  useRemoveWishlistMutation,
  useWishlistQuery,
} from '@/features/wishlist/hooks';
import { colors, spacing } from '@/lib/colors';

export default function FavoritosScreen() {
  const q = useWishlistQuery();
  const remove = useRemoveWishlistMutation();

  if (q.isPending) {
    return <ScreenContainer><Text style={styles.muted}>Carregando…</Text></ScreenContainer>;
  }
  if (q.isError) {
    return <ScreenContainer><Text style={styles.error}>Falha ao carregar.</Text></ScreenContainer>;
  }
  const items = q.data?.items ?? [];
  if (items.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={{ fontSize: 42 }}>❤️</Text>
          <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
          <Text style={styles.muted}>Toque no ☆ em um produto para favoritar.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.img} />
            ) : (
              <View style={[styles.img, styles.placeholder]}>
                <Text>🐾</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Link href={`/produto/${item.slug}`}>
                <Text numberOfLines={2} style={styles.name}>
                  {item.name}
                </Text>
              </Link>
              <PriceTag cents={item.price} size="sm" />
            </View>
            <Pressable onPress={() => remove.mutate(item.productId)}>
              <Text style={styles.removeText}>Remover</Text>
            </Pressable>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing['2xl'] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral900 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  img: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.neutral100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, color: colors.neutral800, marginBottom: 4 },
  removeText: { color: colors.red600, fontSize: 12 },
});
