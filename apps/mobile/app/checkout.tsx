import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { PriceTag } from '@/components/PriceTag';
import { useCartQuery } from '@/features/cart/hooks';
import { useCheckoutMutation } from '@/features/orders/hooks';
import { colors, spacing } from '@/lib/colors';

const schema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  district: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido.'),
  couponCode: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export default function CheckoutScreen() {
  const router = useRouter();
  const cart = useCartQuery();
  const checkout = useCheckoutMutation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: 'Casa',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zip: '',
      couponCode: '',
    },
  });

  if (!cart.data || cart.data.items.length === 0) {
    return (
      <ScreenContainer>
        <Text>Seu carrinho está vazio.</Text>
      </ScreenContainer>
    );
  }

  const onSubmit = async (values: Values) => {
    try {
      const { couponCode, ...address } = values;
      const order = await checkout.mutateAsync({
        address,
        couponCode: couponCode?.trim() || undefined,
      });
      router.replace({ pathname: '/pedidos/[id]', params: { id: order.id } });
    } catch (err) {
      Alert.alert('Erro', (err as Error).message || 'Falha ao finalizar.');
    }
  };

  const fields: { name: keyof Values; label: string; keyboard?: 'default' | 'numeric' | 'email-address' }[] = [
    { name: 'label', label: 'Rótulo (ex.: Casa)' },
    { name: 'zip', label: 'CEP', keyboard: 'numeric' },
    { name: 'street', label: 'Rua' },
    { name: 'number', label: 'Número' },
    { name: 'complement', label: 'Complemento (opcional)' },
    { name: 'district', label: 'Bairro' },
    { name: 'city', label: 'Cidade' },
    { name: 'state', label: 'UF' },
    { name: 'couponCode', label: 'Cupom (opcional)' },
  ];

  return (
    <ScreenContainer>
      <Text style={styles.title}>Endereço de entrega</Text>
      {fields.map((f) => (
        <View key={f.name} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <Controller
            control={control}
            name={f.name}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                invalid={!!errors[f.name]}
                keyboardType={f.keyboard ?? 'default'}
                autoCapitalize={f.name === 'state' ? 'characters' : 'sentences'}
                maxLength={f.name === 'state' ? 2 : undefined}
              />
            )}
          />
          {errors[f.name] && <Text style={styles.error}>{errors[f.name]?.message?.toString()}</Text>}
        </View>
      ))}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.neutral600 }}>Subtotal</Text>
          <PriceTag cents={cart.data.subtotal} />
        </View>
        <Text style={styles.hint}>Frete e desconto calculados pelo servidor.</Text>
      </View>

      <Button
        title={isSubmitting ? 'Finalizando…' : 'Finalizar compra'}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.neutral900, marginBottom: spacing.md },
  field: { marginBottom: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.neutral600, marginBottom: 4 },
  error: { color: colors.red600, fontSize: 12, marginTop: 4 },
  summary: {
    marginVertical: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { fontSize: 12, color: colors.neutral500, marginTop: 8 },
});
