import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, radius } from '@/lib/colors';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ title, variant = 'primary', size = 'md', loading, disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantBg[variant],
        pressed && !disabled && { opacity: 0.8 },
        (disabled || loading) && { opacity: 0.5 },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.brand600} />
      ) : (
        <Text style={[styles.text, variantText[variant], sizeText[size]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: { fontWeight: '600' },
});

const sizeStyles = {
  sm: { paddingVertical: 6, paddingHorizontal: 12 },
  md: { paddingVertical: 10, paddingHorizontal: 16 },
  lg: { paddingVertical: 14, paddingHorizontal: 20 },
} as const;

const sizeText = {
  sm: { fontSize: 13 },
  md: { fontSize: 14 },
  lg: { fontSize: 16 },
} as const;

const variantBg = {
  primary: { backgroundColor: colors.brand600 },
  outline: { backgroundColor: colors.white, borderColor: colors.neutral300 },
  ghost: { backgroundColor: 'transparent' },
} as const;

const variantText = {
  primary: { color: colors.white },
  outline: { color: colors.neutral900 },
  ghost: { color: colors.neutral900 },
} as const;
