import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Button } from '@/components/Button';
import { usePetsQuery } from '@/features/pets/hooks';
import { colors, spacing } from '@/lib/colors';

const SPECIES_LABEL: Record<string, string> = {
  DOG: 'Cão',
  CAT: 'Gato',
  BIRD: 'Ave',
  RABBIT: 'Coelho',
  FISH: 'Peixe',
  REPTILE: 'Réptil',
  RODENT: 'Roedor',
  OTHER: 'Outro',
};

export default function PetsListaScreen() {
  const q = usePetsQuery();

  return (
    <ScreenContainer scroll={false} padded>
      <View style={styles.header}>
        <Text style={styles.title}>Meus pets</Text>
        <Link href="/pets/novo" asChild>
          <Button title="+ Novo" size="sm" />
        </Link>
      </View>

      {q.isPending ? (
        <Text style={styles.muted}>Carregando…</Text>
      ) : q.isError ? (
        <Text style={styles.error}>Falha ao carregar.</Text>
      ) : (
        <FlatList
          data={q.data?.items ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: spacing.sm }}
          ListEmptyComponent={<Text style={styles.muted}>Você ainda não cadastrou pets.</Text>}
          renderItem={({ item }) => (
            <Link href={`/pets/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <Text style={styles.petName}>{item.name}</Text>
                <Text style={styles.petMeta}>
                  {SPECIES_LABEL[item.species] ?? item.species}
                  {item.breed ? ` · ${item.breed}` : ''}
                </Text>
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
  error: { color: colors.red600 },
  card: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  petName: { fontSize: 16, fontWeight: '700', color: colors.neutral900 },
  petMeta: { color: colors.neutral500, fontSize: 12, marginTop: 2 },
});
