import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, radius } from '@/lib/colors';

interface Props extends TextInputProps {
  invalid?: boolean;
}

export const Input = forwardRef<TextInput, Props>(function Input({ invalid, style, ...rest }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.neutral400}
      style={[styles.input, invalid && styles.invalid, style]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.neutral900,
    backgroundColor: colors.white,
  },
  invalid: { borderColor: colors.red600 },
});
