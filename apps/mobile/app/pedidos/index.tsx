import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PriceTag } from '@/components/PriceTag';
import { StatusBadge } from '@/components/StatusBadge';
import { useOrdersQuery } from '@/features/orders/hooks';
import { colors, spacing } from '@/lib/colors';

export default function PedidosListaScreen() {
  const q = useOrdersQuery();

  if (q.isPending) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Carregando…</Text>
      </ScreenContainer>
    );
  }
  if (q.isError) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>Falha ao carregar seus pedidos.</Text>
      </ScreenContainer>
    );
  }
  const items = q.data?.items ?? [];
  if (items.length === 0) {
    return (
      <ScreenContainer>
        <Text style={styles.muted}>Você ainda não tem pedidos.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded>
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/pedidos/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.id}>#{item.id.slice(-8)}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <PriceTag cents={item.total} />
            </Pressable>
          </Link>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.neutral500 },
  error: { color: colors.red600 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  id: { fontFamily: 'monospace', fontSize: 12, color: colors.neutral900 },
  date: { fontSize: 11, color: colors.neutral500, marginTop: 2, marginBottom: 4 },
});
