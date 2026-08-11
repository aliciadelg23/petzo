import { StyleSheet, Text, type TextStyle } from 'react-native';
import { formatBRL } from '@/lib/format';
import { colors } from '@/lib/colors';

interface Props {
  cents: number;
  size?: 'sm' | 'md' | 'lg';
  style?: TextStyle;
}

export function PriceTag({ cents, size = 'md', style }: Props) {
  return <Text style={[styles.text, sizeStyles[size], style]}>{formatBRL(cents)}</Text>;
}

const styles = StyleSheet.create({
  text: { color: colors.neutral900, fontWeight: '700' },
});

const sizeStyles = {
  sm: { fontSize: 13 },
  md: { fontSize: 16 },
  lg: { fontSize: 20 },
} as const;
