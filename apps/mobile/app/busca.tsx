import { useState } from 'react';
import { Link } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Input } from '@/components/Input';
import { PriceTag } from '@/components/PriceTag';
import { useProductsQuery } from '@/features/catalog/hooks';
import { colors, spacing } from '@/lib/colors';

export default function BuscaScreen() {
  const [text, setText] = useState('');
  const q = useProductsQuery(text.length >= 2 ? { search: text, limit: 30 } : {});

  return (
    <ScreenContainer scroll={false} padded>
      <Input
        value={text}
        onChangeText={setText}
        placeholder="Buscar produtos…"
        autoFocus
      />
      <View style={{ marginTop: spacing.md, flex: 1 }}>
        {text.length < 2 ? (
          <Text style={styles.hint}>Digite ao menos 2 caracteres.</Text>
        ) : q.isPending ? (
          <Text style={styles.muted}>Buscando…</Text>
        ) : q.data && q.data.items.length === 0 ? (
          <Text style={styles.muted}>Nada encontrado para "{text}".</Text>
        ) : (
          <FlatList
            data={q.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item }) => (
              <Link href={`/produto/${item.slug}`} asChild>
                <Pressable style={styles.row}>
                  {item.images[0] ? (
                    <Image source={{ uri: item.images[0].url }} style={styles.img} />
                  ) : (
                    <View style={[styles.img, styles.placeholder]}>
                      <Text>🐾</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.name}>
                      {item.name}
                    </Text>
                    <PriceTag cents={item.price} size="sm" />
                  </View>
                </Pressable>
              </Link>
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.neutral500 },
  muted: { color: colors.neutral500 },
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
});
