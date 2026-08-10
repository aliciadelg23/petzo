import { Link, useRouter } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import { Button } from '@/components/Button';
import {
  useCartQuery,
  useClearCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/features/cart/hooks';
import { colors, spacing } from '@/lib/colors';

export default function CarrinhoScreen() {
  const router = useRouter();
  const cart = useCartQuery();
  const remove = useRemoveCartItemMutation();
  const update = useUpdateCartItemMutation();
  const clear = useClearCartMutation();

  if (cart.isPending) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Carregando…</Text>
      </ScreenContainer>
    );
  }
  if (cart.isError || !cart.data) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>Falha ao carregar carrinho.</Text>
      </ScreenContainer>
    );
  }
  if (cart.data.items.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Link href="/(tabs)/produtos" asChild>
            <Button title="Ver produtos" />
          </Link>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded>
      <FlatList
        data={cart.data.items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing['2xl'] }}
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
              <Text numberOfLines={2} style={styles.name}>
                {item.name}
              </Text>
              <PriceTag cents={item.lineTotal} size="sm" />
              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() =>
                    update.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })
                  }
                  disabled={item.quantity <= 1}
                  style={[styles.qtyBtn, item.quantity <= 1 && { opacity: 0.4 }]}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Pressable
                  onPress={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                  disabled={item.quantity >= item.availableStock}
                  style={[styles.qtyBtn, item.quantity >= item.availableStock && { opacity: 0.4 }]}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
                <Pressable onPress={() => remove.mutate(item.id)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.neutral600 }}>Subtotal</Text>
          <PriceTag cents={cart.data.subtotal} />
        </View>
        <Text style={styles.hint}>Frete e desconto calculados no checkout.</Text>
        <Button
          title="Ir para checkout"
          onPress={() => router.push('/checkout')}
        />
        <Pressable onPress={() => clear.mutate()} style={{ alignSelf: 'center', marginTop: spacing.sm }}>
          <Text style={styles.clearText}>Esvaziar carrinho</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing['2xl'] },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral900 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  img: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.neutral100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, color: colors.neutral800, marginBottom: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: colors.neutral900 },
  qty: { minWidth: 24, textAlign: 'center', fontWeight: '600' },
  removeBtn: { marginLeft: 'auto' },
  removeText: { color: colors.red600, fontSize: 12 },
  footer: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  hint: { color: colors.neutral500, fontSize: 12, marginBottom: spacing.sm },
  clearText: { color: colors.neutral600, fontSize: 12 },
});
