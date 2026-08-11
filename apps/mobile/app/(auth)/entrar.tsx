import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useLoginMutation } from '@/features/auth/hooks';
import { colors } from '@/lib/colors';

const schema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});
type Values = z.infer<typeof schema>;

export default function EntrarScreen() {
  const router = useRouter();
  const login = useLoginMutation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: Values) => {
    try {
      await login.mutateAsync(values);
      router.replace('/(tabs)');
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError('root', {
        message: status === 401 ? 'Email ou senha incorretos.' : 'Não foi possível entrar.',
      });
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>
        Novo por aqui?{' '}
        <Link href="/(auth)/cadastrar" style={styles.link}>
          Criar conta
        </Link>
      </Text>

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
              autoComplete="current-password"
              invalid={!!errors.password}
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
      </View>

      {errors.root && <Text style={styles.error}>{errors.root.message}</Text>}

      <Button
        title={isSubmitting ? 'Entrando…' : 'Entrar'}
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
  error: { color: colors.red600, fontSize: 12, marginTop: 4 },
});
