import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import { Button } from '@/components/Button';
import { useProductQuery } from '@/features/catalog/hooks';
import { useAddCartMutation } from '@/features/cart/hooks';
import {
  useAddWishlistMutation,
  useRemoveWishlistMutation,
  useWishlistQuery,
} from '@/features/wishlist/hooks';
import { colors, spacing } from '@/lib/colors';

export default function ProdutoDetalhe() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useProductQuery(slug);
  const addToCart = useAddCartMutation();
  const wishlist = useWishlistQuery();
  const addWishlist = useAddWishlistMutation();
  const removeWishlist = useRemoveWishlistMutation();

  if (q.isPending) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Carregando…</Text>
      </ScreenContainer>
    );
  }
  if (q.isError || !q.data) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>Produto não encontrado.</Text>
      </ScreenContainer>
    );
  }

  const isFavorite = wishlist.data?.items.some((it) => it.productId === q.data.id) ?? false;
  const toggleFavorite = () => {
    if (isFavorite) removeWishlist.mutate(q.data.id);
    else addWishlist.mutate(q.data.id);
  };

  const imageUrl = q.data.images[0]?.url;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.placeholder]}>
          <Text style={{ fontSize: 64 }}>🐾</Text>
        </View>
      )}
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.brand}>{q.data.brand.name}</Text>
        <Text style={styles.name}>{q.data.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
          <PriceTag cents={q.data.price} size="lg" />
          {q.data.available ? (
            <Text style={styles.stockOk}>Em estoque</Text>
          ) : (
            <Text style={styles.stockNo}>Esgotado</Text>
          )}
        </View>
        <Text style={styles.description}>{q.data.description}</Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            title={addToCart.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
            loading={addToCart.isPending}
            onPress={() => addToCart.mutate({ productId: q.data.id, quantity: 1 })}
            disabled={!q.data.available}
          />
          <Button
            title={isFavorite ? '★ Favorito' : '☆ Favoritar'}
            variant="outline"
            onPress={toggleFavorite}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', aspectRatio: 1, backgroundColor: colors.neutral100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.neutral500, fontSize: 12, textTransform: 'uppercase' },
  name: { fontSize: 22, fontWeight: '700', color: colors.neutral900, marginTop: 4 },
  description: { color: colors.neutral700, marginTop: spacing.md, lineHeight: 20 },
  stockOk: { color: colors.emerald600, fontSize: 12, fontWeight: '600' },
  stockNo: { color: colors.red600, fontSize: 12, fontWeight: '600' },
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
});
