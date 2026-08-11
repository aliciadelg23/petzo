import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useRegisterMutation } from '@/features/auth/hooks';
import { colors } from '@/lib/colors';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório.').max(120),
  email: z.string().email('Email inválido.'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .max(72)
    .regex(/[a-z]/, 'Precisa de minúscula.')
    .regex(/[A-Z]/, 'Precisa de maiúscula.')
    .regex(/[0-9]/, 'Precisa de dígito.')
    .regex(/[^A-Za-z0-9]/, 'Precisa de caractere especial.'),
});
type Values = z.infer<typeof schema>;

export default function CadastrarScreen() {
  const router = useRouter();
  const register = useRegisterMutation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: Values) => {
    try {
      await register.mutateAsync(values);
      router.replace('/(tabs)');
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 409) setError('email', { message: 'Este email já está cadastrado.' });
      else setError('root', { message: 'Não foi possível criar a conta.' });
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.subtitle}>
        Já tem conta?{' '}
        <Link href="/(auth)/entrar" style={styles.link}>
          Entrar
        </Link>
      </Text>

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
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              invalid={!!errors.email}
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Senha</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              invalid={!!errors.password}
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
        <Text style={styles.hint}>Ao menos 8 caracteres, com maiúscula, minúscula, número e especial.</Text>
      </View>

      {errors.root && <Text style={styles.error}>{errors.root.message}</Text>}

      <Button
        title={isSubmitting ? 'Criando…' : 'Criar conta'}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.neutral900 },
  subtitle: { color: colors.neutral600, marginTop: 4, marginBottom: 24 },
  link: { color: colors.brand600, textDecorationLine: 'underline' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: colors.neutral600, marginBottom: 4 },
  hint: { color: colors.neutral500, fontSize: 11, marginTop: 4 },
  error: { color: colors.red600, fontSize: 12, marginTop: 4 },
});
