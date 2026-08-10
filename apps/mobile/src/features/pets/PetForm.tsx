import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import type { Species } from '@/features/catalog/api';
import { colors, spacing } from '@/lib/colors';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório.').max(80),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'REPTILE', 'RODENT', 'OTHER']),
  breed: z.string().max(80).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD.')
    .optional()
    .or(z.literal('')),
});
export type PetFormValues = z.infer<typeof schema>;

const SPECIES: { value: Species; label: string }[] = [
  { value: 'DOG', label: 'Cão' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RABBIT', label: 'Coelho' },
  { value: 'FISH', label: 'Peixe' },
  { value: 'REPTILE', label: 'Réptil' },
  { value: 'RODENT', label: 'Roedor' },
  { value: 'OTHER', label: 'Outro' },
];

interface Props {
  initialValues?: Partial<PetFormValues>;
  submitLabel: string;
  onSubmit: (values: PetFormValues) => Promise<void> | void;
  onDelete?: () => void;
}

export function PetForm({ initialValues, submitLabel, onSubmit, onDelete }: Props) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      species: initialValues?.species ?? 'DOG',
      breed: initialValues?.breed ?? '',
      birthDate: initialValues?.birthDate ?? '',
    },
  });

  const speciesValue = watch('species');

  return (
    <View>
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input value={value} onChangeText={onChange} onBlur={onBlur} invalid={!!errors.name} />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Espécie</Text>
        <View style={styles.chipRow}>
          {SPECIES.map((s) => {
            const active = speciesValue === s.value;
            return (
              <Text
                key={s.value}
                onPress={() => setValue('species', s.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                {s.label}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Raça (opcional)</Text>
        <Controller
          control={control}
          name="breed"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input value={value ?? ''} onChangeText={onChange} onBlur={onBlur} />
          )}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nascimento (YYYY-MM-DD, opcional)</Text>
        <Controller
          control={control}
          name="birthDate"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="2023-05-10"
              invalid={!!errors.birthDate}
            />
          )}
        />
        {errors.birthDate && <Text style={styles.error}>{errors.birthDate.message}</Text>}
      </View>

      <Button
        title={isSubmitting ? 'Salvando…' : submitLabel}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      {onDelete && (
        <Text onPress={onDelete} style={styles.deleteText}>
          Excluir pet
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: colors.neutral600, marginBottom: 4 },
  error: { color: colors.red600, fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral300,
    backgroundColor: colors.white,
    fontSize: 12,
    color: colors.neutral700,
  },
  chipActive: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand500,
    color: colors.brand700,
    fontWeight: '700',
  },
  deleteText: {
    color: colors.red600,
    textAlign: 'center',
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
});
